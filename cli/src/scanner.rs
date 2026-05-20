use std::fs;
use std::path::Path;

use crate::entropy;
use crate::report::ScanMatch;
use crate::rules::{Rule, get_rules};

pub struct ScanResult {
    pub total_files: u64,
    pub total_leaks: u64,
    pub matches: Vec<ScanMatch>,
    pub duration_ms: u64,
}

pub struct ScannerConfig {
    pub entropy_threshold: f64,
    pub fail_on_severity: String,
    pub exclude_dirs: Vec<String>,
    pub exclude_exts: Vec<String>,
}

impl Default for ScannerConfig {
    fn default() -> Self {
        ScannerConfig {
            entropy_threshold: 4.5,
            fail_on_severity: "critical".to_string(),
            exclude_dirs: vec![
                "node_modules".into(),
                "dist".into(),
                "build".into(),
                ".git".into(),
                "vendor".into(),
                ".next".into(),
                "target".into(),
            ],
            exclude_exts: vec![
                ".json".into(),
                ".md".into(),
                ".lock".into(),
                ".png".into(),
                ".jpg".into(),
                ".jpeg".into(),
                ".gif".into(),
                ".svg".into(),
                ".ico".into(),
                ".woff".into(),
                ".woff2".into(),
                ".ttf".into(),
                ".eot".into(),
                ".otf".into(),
                ".pdf".into(),
                ".zip".into(),
                ".tar".into(),
                ".gz".into(),
            ],
        }
    }
}

pub fn scan_path(path: &Path, config: &ScannerConfig) -> ScanResult {
    let start = std::time::Instant::now();
    let rules = get_rules();
    let mut matches = Vec::new();
    let mut total_files = 0;
    let compiled_rules: Vec<(Rule, regex::Regex)> = rules
        .into_iter()
        .map(|r| {
            let re = regex::Regex::new(r.pattern).expect("invalid rule pattern");
            (r, re)
        })
        .collect();

    if path.is_file() {
        total_files = 1;
        scan_file(path, &compiled_rules, config, &mut matches);
    } else if path.is_dir() {
        for entry in walkdir::WalkDir::new(path)
            .into_iter()
            .filter_entry(|e| {
                let name = e.file_name().to_string_lossy();
                if e.file_type().is_dir() {
                    !config.exclude_dirs.contains(&name.to_string())
                } else {
                    true
                }
            })
        {
            if let Ok(entry) = entry {
                if entry.file_type().is_file() {
                    let ext = entry
                        .path()
                        .extension()
                        .map(|e| format!(".{}", e.to_string_lossy().to_lowercase()))
                        .unwrap_or_default();
                    if !config.exclude_exts.contains(&ext) {
                        total_files += 1;
                        scan_file(entry.path(), &compiled_rules, config, &mut matches);
                    }
                }
            }
        }
    }

    let duration_ms = start.elapsed().as_millis() as u64;
    let total_leaks = matches.len() as u64;

    ScanResult {
        total_files,
        total_leaks,
        matches,
        duration_ms,
    }
}

fn scan_file(
    path: &Path,
    rules: &[(Rule, regex::Regex)],
    config: &ScannerConfig,
    results: &mut Vec<ScanMatch>,
) {
    let content = match fs::read_to_string(path) {
        Ok(c) => c,
        Err(_) => return,
    };
    if content.len() > 5 * 1024 * 1024 {
        return;
    }
    let lines: Vec<&str> = content.lines().collect();
    let path_str = path.to_string_lossy().to_string();

    for (line_idx, line_text) in lines.iter().enumerate() {
        let has_ignore = line_text.contains("securify:ignore");
        let line_entropy = entropy::calculate_entropy(line_text);

        for (rule, re) in rules {
            for cap in re.find_iter(line_text) {
                let matched_bit = if has_ignore { "bypassed" } else { "blocked" };
                let matched_entropy = entropy::calculate_entropy(cap.as_str());

                if !has_ignore && matched_entropy >= config.entropy_threshold {
                    results.push(ScanMatch {
                        rule_id: rule.id.to_string(),
                        rule_name: rule.name.to_string(),
                        severity: rule.severity.to_string(),
                        category: rule.category.to_string(),
                        file_path: path_str.clone(),
                        line: (line_idx + 1) as u64,
                        matched_text: cap.as_str().to_string(),
                        line_entropy,
                        matched_entropy,
                        matched_bit: matched_bit.to_string(),
                        description: rule.description.to_string(),
                    });
                }
            }
        }
    }
}
