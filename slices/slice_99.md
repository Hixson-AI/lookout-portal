# Slice 99: Deferred Improvements

## Infrastructure Improvements

### Dockerfile Static Server
- **Current**: Using `serve` (Node.js-based) to host static React build
- **Improvement**: Switch to nginx for better robustness, stability, and security
- **Rationale**: nginx is purpose-built for static file serving, has smaller attack surface, better performance, and more mature security track record
- **Priority**: Low (current solution works fine)
