<?php
// Fallback Rector config, used only when the project has none. Dry-run only; the runner never writes changes.
use Rector\Config\RectorConfig;

return RectorConfig::configure()
    ->withPhpSets(php84: true)
    ->withPreparedSets(deadCode: true);
