#!/usr/bin/env tsx

import { readFileSync } from 'fs';
import { join } from 'path';
import { load } from 'js-yaml';
import { program } from 'commander';

interface DomainConfig {
  domain: string;
  type: string;
  target: string;
  status: string;
  ssl: boolean;
  proxy?: boolean;
  description: string;
}

interface DnsConfig {
  domains: Record<string, Record<string, DomainConfig>>;
  cloudflare: {
    zone_id: string;
    ttl: {
      default: number;
    };
  };
}

class DnsManager {
  private config: DnsConfig;
  private dryRun: boolean;
  private cloudflareToken: string;
  private flyIps?: {
    ipv4?: string;
    ipv6_1?: string;
    ipv6_2?: string;
  };
  private flyHostname?: string;
  private flyOwnership?: {
    name?: string;
    value?: string;
  };
  private acmeChallenge?: string;

  constructor(dryRun = false, yamlPath?: string) {
    this.dryRun = dryRun;

    // Check for Fly.io IPs from environment
    this.flyIps = {
      ipv4: process.env.FLY_IPV4,
      ipv6_1: process.env.FLY_IPV6_1,
      ipv6_2: process.env.FLY_IPV6_2,
    };

    // Check for Fly.io hostname from environment (for CNAME fallback)
    this.flyHostname = process.env.FLY_HOSTNAME;

    // Check for Fly.io ownership TXT record from environment
    this.flyOwnership = {
      name: process.env.FLY_OWNERSHIP_NAME,
      value: process.env.FLY_OWNERSHIP_VALUE,
    };

    // Check for ACME challenge CNAME target from environment (for wildcard cert DNS-01)
    this.acmeChallenge = process.env.FLY_ACME_CHALLENGE;
    
    // Load configuration
    const configPath = yamlPath || join(process.cwd(), 'dns.yaml');
    let configContent = readFileSync(configPath, 'utf8');
    
    // Substitute environment variables
    configContent = configContent.replace(/\$\{([^}]+)\}/g, (match, envVar) => {
      const value = process.env[envVar];
      if (value === undefined) {
        throw new Error(`Environment variable ${envVar} is not set`);
      }
      return value;
    });
    
    this.config = load(configContent) as DnsConfig;
    
    // Get Cloudflare token
    this.cloudflareToken = process.env.CLOUDFLARE_API_TOKEN || '';
    if (!this.cloudflareToken && !dryRun) {
      throw new Error('CLOUDFLARE_API_TOKEN environment variable is required');
    }
  }

  async manageRecords(env?: string): Promise<void> {
    console.log('🌐 Managing DNS records...\n');
    
    let recordsToProcess: Array<{service: string, env: string, config: DomainConfig}> = [];
    
    // Collect records based on environment filter
    for (const [service, environments] of Object.entries(this.config.domains)) {
      for (const [envName, config] of Object.entries(environments)) {
        if (env && envName !== env) continue;
        if (config.status === 'disabled') continue;
        
        recordsToProcess.push({
          service,
          env: envName,
          config
        });
      }
    }
    
    if (recordsToProcess.length === 0) {
      console.log(`⚠️  No DNS records found${env ? ` for environment: ${env}` : ''}`);
      return;
    }
    
    console.log(`Found ${recordsToProcess.length} record(s) to process\n`);
    
    for (const {service, env, config} of recordsToProcess) {
      await this.syncRecord(service, env, config);
    }

    // Sync ACME challenge record for wildcard cert DNS-01 verification
    console.log(`    ACME challenge target: ${this.acmeChallenge ? this.acmeChallenge : 'not provided'}`);
    if (this.acmeChallenge) {
      await this.syncAcmeChallengeRecord();
    }

    console.log('\n✅ DNS management completed!');
  }

  private async syncRecord(service: string, env: string, config: DomainConfig): Promise<void> {
    // Use Fly.io IPs if available, otherwise use CNAME target from YAML or Fly.io hostname
    let recordType = config.type;
    let recordTarget = config.target;

    console.log(`    Fly.io IPs received: ipv4=${this.flyIps?.ipv4}, ipv6_1=${this.flyIps?.ipv6_1}, ipv6_2=${this.flyIps?.ipv6_2}`);
    console.log(`    Fly.io hostname: ${this.flyHostname}`);

    if (this.flyIps?.ipv4 && this.flyIps.ipv6_1 &&
        this.flyIps.ipv4 !== '' && this.flyIps.ipv6_1 !== '') {
      // Use A/AAAA records with Fly.io IPs instead of CNAME
      console.log(`  ${env}: ${config.domain} (using Fly.io IPs)`);
      await this.syncFlyIpsRecord(config);
      return;
    }

    console.log(`    ⚠️  Not all Fly.io IPs present, falling back to CNAME`);

    // Use Fly.io hostname if available for CNAME, otherwise use YAML target
    if (this.flyHostname && config.type === 'CNAME') {
      recordTarget = this.flyHostname;
      console.log(`  ${env}: ${config.domain} (CNAME → ${recordTarget})`);
    } else {
      console.log(`  ${env}: ${config.domain} (${config.type} → ${config.target})`);
    }

    if (this.dryRun) {
      console.log(`    📝 Would ${recordType} record for ${config.domain}`);
      return;
    }

    try {
      // Check if record exists
      const existingRecords = await this.fetch(
        `https://api.cloudflare.com/client/v4/zones/${this.config.cloudflare.zone_id}/dns_records?type=${recordType}&name=${config.domain}`
      );

      if (existingRecords.result.length > 0) {
        // Update existing record
        const existing = existingRecords.result[0];

        const currentProxy = existing.proxied || false;
        const desiredProxy = config.proxy || false;

        if (existing.content === recordTarget && currentProxy === desiredProxy) {
          console.log(`    ✓ Record already exists with correct content and proxy setting`);
          return;
        }

        await this.fetch(
          `https://api.cloudflare.com/client/v4/zones/${this.config.cloudflare.zone_id}/dns_records/${existing.id}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              type: recordType,
              name: config.domain,
              content: recordTarget,
              ttl: this.config.cloudflare.ttl.default,
              proxied: config.proxy || false
            })
          }
        );
        const updateReason = existing.content !== recordTarget ? 'content' : 'proxy setting';
        console.log(`    📝 Updated existing record (${updateReason})`);
      } else {
        // Create new record
        await this.fetch(
          `https://api.cloudflare.com/client/v4/zones/${this.config.cloudflare.zone_id}/dns_records`,
          {
            method: 'POST',
            body: JSON.stringify({
              type: recordType,
              name: config.domain,
              content: recordTarget,
              ttl: this.config.cloudflare.ttl.default,
              proxied: config.proxy || false
            })
          }
        );
        console.log(`    ➕ Created new record`);
      }
    } catch (error) {
      console.error(`    ❌ Failed to sync record: ${error}`);
      throw error;
    }
  }

  private async syncFlyIpsRecord(config: DomainConfig): Promise<void> {
    // Sync A record with IPv4
    if (this.flyIps?.ipv4) {
      await this.syncSingleRecord('A', config.domain, this.flyIps.ipv4, config.proxy);
    }

    // Sync AAAA records with IPv6 addresses
    if (this.flyIps?.ipv6_1) {
      await this.syncSingleRecord('AAAA', config.domain, this.flyIps.ipv6_1, config.proxy);
    }
    if (this.flyIps?.ipv6_2) {
      await this.syncSingleRecord('AAAA', config.domain, this.flyIps.ipv6_2, config.proxy);
    }

    // Delete any existing CNAME records for this domain
    try {
      const existingCnameRecords = await this.fetch(
        `https://api.cloudflare.com/client/v4/zones/${this.config.cloudflare.zone_id}/dns_records?type=CNAME&name=${config.domain}`
      );

      for (const record of existingCnameRecords.result) {
        await this.fetch(
          `https://api.cloudflare.com/client/v4/zones/${this.config.cloudflare.zone_id}/dns_records/${record.id}`,
          { method: 'DELETE' }
        );
        console.log(`    🗑️  Deleted old CNAME record`);
      }
    } catch (error) {
      console.error(`    ⚠️  Failed to delete existing CNAME records: ${error}`);
      // Don't throw error, continue
    }
  }

  private async syncAcmeChallengeRecord(): Promise<void> {
    if (!this.acmeChallenge) {
      console.log(`    ⚠️  ACME challenge target not provided, skipping`);
      return;
    }

    // Find the wildcard domain from config to derive ACME challenge name
    let wildcardDomain = '';
    for (const [service, environments] of Object.entries(this.config.domains)) {
      for (const [envName, config] of Object.entries(environments)) {
        if (config.domain.startsWith('*.')) {
          wildcardDomain = config.domain;
          break;
        }
      }
      if (wildcardDomain) break;
    }

    if (!wildcardDomain) {
      console.log(`    ⚠️  No wildcard domain found in config, skipping ACME challenge`);
      return;
    }

    // Extract the base domain from the wildcard domain
    // Wildcard: *.api.dev.client.cumberlandstrategygroup.com
    // ACME challenge: _acme-challenge.api.dev.client.cumberlandstrategygroup.com
    const challengeName = wildcardDomain.replace('*.', '_acme-challenge.');

    console.log(`  ${challengeName} (CNAME → ${this.acmeChallenge}) [DNS-01 challenge]`);

    if (this.dryRun) {
      console.log(`    📝 Would create ACME challenge CNAME record`);
      return;
    }

    try {
      // Check if record exists
      const existingRecords = await this.fetch(
        `https://api.cloudflare.com/client/v4/zones/${this.config.cloudflare.zone_id}/dns_records?type=CNAME&name=${challengeName}`
      );

      if (existingRecords.result.length > 0) {
        const existing = existingRecords.result[0];

        if (existing.content === this.acmeChallenge) {
          console.log(`    ✓ ACME challenge record already exists with correct target`);
          return;
        }

        await this.fetch(
          `https://api.cloudflare.com/client/v4/zones/${this.config.cloudflare.zone_id}/dns_records/${existing.id}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              type: 'CNAME',
              name: challengeName,
              content: this.acmeChallenge,
              ttl: this.config.cloudflare.ttl.default,
              proxied: false
            })
          }
        );
        console.log(`    📝 Updated ACME challenge record`);
      } else {
        // Create new record
        await this.fetch(
          `https://api.cloudflare.com/client/v4/zones/${this.config.cloudflare.zone_id}/dns_records`,
          {
            method: 'POST',
            body: JSON.stringify({
              type: 'CNAME',
              name: challengeName,
              content: this.acmeChallenge,
              ttl: this.config.cloudflare.ttl.default,
              proxied: false
            })
          }
        );
        console.log(`    ➕ Created ACME challenge record`);
      }
    } catch (error) {
      console.error(`    ❌ Failed to sync ACME challenge record: ${error}`);
      throw error;
    }
  }

  private async syncSingleRecord(type: string, name: string, content: string, proxy?: boolean): Promise<void> {
    // Cloudflare requires TXT record content wrapped in double quotes
    // Strip any existing quotes first to avoid double-quoting
    const apiContent = type === 'TXT' ? `"${content.replace(/^"|"$/g, '')}"` : content;

    try {
      // Check if record exists
      const existingRecords = await this.fetch(
        `https://api.cloudflare.com/client/v4/zones/${this.config.cloudflare.zone_id}/dns_records?type=${type}&name=${name}`
      );

      const existingRecord = existingRecords.result.find((r: any) => r.content === apiContent || r.content === content);

      if (existingRecord) {
        const currentProxy = existingRecord.proxied || false;
        const desiredProxy = proxy || false;

        if (currentProxy === desiredProxy) {
          console.log(`    ✓ ${type} record already exists with correct proxy setting (${content})`);
          return;
        }

        await this.fetch(
          `https://api.cloudflare.com/client/v4/zones/${this.config.cloudflare.zone_id}/dns_records/${existingRecord.id}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              type,
              name,
              content: apiContent,
              ttl: this.config.cloudflare.ttl.default,
              proxied: desiredProxy
            })
          }
        );
        console.log(`    📝 Updated ${type} record proxy setting (${content})`);
      } else {
        // Create new record
        await this.fetch(
          `https://api.cloudflare.com/client/v4/zones/${this.config.cloudflare.zone_id}/dns_records`,
          {
            method: 'POST',
            body: JSON.stringify({
              type,
              name,
              content: apiContent,
              ttl: this.config.cloudflare.ttl.default,
              proxied: proxy || false
            })
          }
        );
        console.log(`    ➕ Created ${type} record (${content})`);
      }
    } catch (error) {
      console.error(`    ❌ Failed to sync ${type} record: ${error}`);
      throw error;
    }
  }

  private async fetch(url: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.cloudflareToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      // Get detailed error response from Cloudflare
      const errorBody = await response.text();
      console.error(`Cloudflare API Error Response: ${errorBody}`);
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorBody}`);
    }
    
    return response.json();
  }
}

// CLI setup
program
  .name('dns')
  .description('Manage DNS records from yaml file')
  .option('--dry-run', 'Show what would be done without making changes')
  .option('--env <env>', 'Sync only specific environment')
  .option('--yaml <path>', 'Path to YAML file (default: dns.yaml)')
  .action(async (options: any) => {
    try {
      const manager = new DnsManager(options.dryRun, options.yaml);
      await manager.manageRecords(options.env);
    } catch (error) {
      console.error('❌ DNS management failed:', error);
      process.exit(1);
    }
  });

program.parse();
