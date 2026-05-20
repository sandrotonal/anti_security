use std::fs;
use std::path::Path;

use serde::Deserialize;

use crate::scanner::ScannerConfig;

#[derive(Debug, Deserialize)]
pub struct TomlConfig {
    pub engine: Option<EngineConfig>,
    pub exclude: Option<ExcludeConfig>,
    pub scanners: Option<ScannersConfig>,
}

#[derive(Debug, Deserialize)]
pub struct EngineConfig {
    pub entropy_threshold: Option<f64>,
    pub fail_on_severity: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ExcludeConfig {
    pub directories: Option<Vec<String>>,
    pub extensions: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct ScannersConfig {
    pub aws: Option<bool>,
    pub stripe: Option<bool>,
    pub github: Option<bool>,
    pub gcp: Option<bool>,
    pub slack: Option<bool>,
    pub postgres: Option<bool>,
    pub ssh_keys: Option<bool>,
}

pub fn load_config(path: &Path) -> Option<TomlConfig> {
    let config_path = if path.is_dir() {
        path.join("securify.toml")
    } else {
        path.to_path_buf()
    };

    if !config_path.exists() {
        return None;
    }

    let content = fs::read_to_string(&config_path).ok()?;
    toml::from_str(&content).ok()
}

pub fn merge_config(base: ScannerConfig, toml: TomlConfig) -> ScannerConfig {
    let mut config = base;

    if let Some(engine) = toml.engine {
        if let Some(t) = engine.entropy_threshold {
            config.entropy_threshold = t;
        }
        if let Some(s) = engine.fail_on_severity {
            config.fail_on_severity = s;
        }
    }

    if let Some(exclude) = toml.exclude {
        if let Some(dirs) = exclude.directories {
            config.exclude_dirs = dirs;
        }
        if let Some(exts) = exclude.extensions {
            config.exclude_exts = exts;
        }
    }

    config
}
