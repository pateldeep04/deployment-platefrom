# Security Policy & Architecture

## Security Layers
1. **Archive Sanitization**: Strict protection against path-traversal (`../`) attacks when extracting ZIPs.
2. **ZIP Bomb Defense**: Maximum decompression ratio of 100:1 and quota limits.
3. **Executable Rejection**: Automated screening blocking `.exe`, `.bat`, `.sh`, `.msi`.
4. **Isolated Runtimes**: Non-root sandboxed execution for PHP and tenant static assets.
5. **Masked Secrets**: Environment variables are protected and filtered at rest and in API responses.
