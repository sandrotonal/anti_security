use colored::Colorize;
use serde::Serialize;

use crate::scanner::ScanResult;

#[derive(Debug, Clone, Serialize)]
pub struct ScanMatch {
    pub rule_id: String,
    pub rule_name: String,
    pub severity: String,
    pub category: String,
    pub file_path: String,
    pub line: u64,
    pub matched_text: String,
    pub line_entropy: f64,
    pub matched_entropy: f64,
    pub matched_bit: String,
    pub description: String,
}

pub fn print_terminal_report(result: &ScanResult) {
    println!();
    println!("{}", "╔══════════════════════════════════════════════════════════╗".bright_white());
    println!("{}", "║              securify scan complete                     ║".bright_white());
    println!("{}", "╚══════════════════════════════════════════════════════════╝".bright_white());
    println!();

    println!(
        " {} {}",
        "✔".green(),
        format!(
            "scanned {} files in {}ms",
            result.total_files, result.duration_ms
        )
        .white()
    );

    if result.total_leaks == 0 {
        println!(
            " {} {}",
            "✔".green(),
            "no secrets or credentials detected. codebase is clean.".white()
        );
    } else {
        println!(
            " {} {}",
            "✖".red(),
            format!("{} potential secrets detected!", result.total_leaks)
                .red()
                .bold()
        );
        println!();

        for (i, m) in result.matches.iter().enumerate() {
            let severity_color = match m.severity.as_str() {
                "critical" => "critical".red(),
                "high" => "high".yellow(),
                _ => "warning".normal(),
            };

            println!(" {}───────────────────── {}", "┌".bright_black(), (i + 1).to_string().white());
            println!(
                " {} rule    : {} ({})",
                "│".bright_black(),
                m.rule_name.bright_white(),
                severity_color
            );
            println!(
                " {} file    : {}:{}",
                "│".bright_black(),
                m.file_path.bright_cyan(),
                m.line.to_string().bright_cyan()
            );
            println!(
                " {} match   : {}",
                "│".bright_black(),
                m.matched_text.red()
            );
            println!(
                " {} entropy : {:.2} bits",
                "│".bright_black(),
                m.matched_entropy
            );
            println!(
                " {} status  : {}",
                "│".bright_black(),
                m.matched_bit.bright_black()
            );
            println!(
                " {} {}",
                "└".bright_black(),
                "─".repeat(50).bright_black()
            );
        }
    }

    println!();
    if result.total_leaks > 0 {
        println!(
            " {}",
            "⚠  credentials detected! review matches above before committing.".yellow()
        );
    }
    println!(
        " {}",
        "→ securify runs entirely locally. no data leaves your machine.".bright_black()
    );
    println!();
}

pub fn print_json_report(result: &ScanResult) {
    let output = serde_json::to_string_pretty(result).unwrap_or_else(|_| "{}".to_string());
    println!("{}", output);
}
