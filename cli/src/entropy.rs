use std::collections::HashMap;

pub fn calculate_entropy(str: &str) -> f64 {
    if str.is_empty() {
        return 0.0;
    }
    let len = str.len() as f64;
    let mut frequencies: HashMap<char, u64> = HashMap::new();
    for ch in str.chars() {
        *frequencies.entry(ch).or_insert(0) += 1;
    }
    let mut entropy = 0.0;
    for &count in frequencies.values() {
        let p = count as f64 / len;
        entropy -= p * p.log2();
    }
    (entropy * 100.0).round() / 100.0
}

pub fn get_strength_rating(entropy: f64, len: usize) -> (&'static str, &'static str) {
    if len == 0 {
        return ("none", "neutral-500");
    }
    let total_bits = entropy * len as f64;
    if total_bits < 40.0 {
        ("very weak", "red-500")
    } else if total_bits < 60.0 {
        ("weak", "orange-500")
    } else if total_bits < 80.0 {
        ("medium strength", "yellow-500")
    } else {
        ("cryptographically strong", "emerald-500")
    }
}

pub fn estimate_brute_force_time(entropy: f64, len: usize) -> String {
    if len == 0 {
        return "0 seconds".to_string();
    }
    let total_bits = entropy * len as f64;
    let guesses = 2.0_f64.powf(total_bits.min(128.0));
    let guesses_per_second = 1_000_000_000.0;
    let seconds = guesses / guesses_per_second;

    if seconds < 1.0 {
        "less than a millisecond".to_string()
    } else if seconds < 60.0 {
        format!("{} seconds", seconds.round())
    } else if seconds < 3600.0 {
        format!("{} minutes", (seconds / 60.0).round())
    } else if seconds < 86400.0 {
        format!("{} hours", (seconds / 3600.0).round())
    } else if seconds < 31536000.0 {
        format!("{} days", (seconds / 86400.0).round())
    } else if seconds < 31_536_000_000.0 {
        format!("{} years", (seconds / 31536000.0).round())
    } else if seconds < 3.1536e13 {
        format!("{}k years", (seconds / 31536000.0 / 1000.0).round())
    } else {
        "practically infinite (centuries)".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_entropy_empty() {
        assert_eq!(calculate_entropy(""), 0.0);
    }

    #[test]
    fn test_entropy_weak() {
        let e = calculate_entropy("aaaa");
        assert!(e < 1.0);
    }

    #[test]
    fn test_entropy_strong() {
        let e = calculate_entropy("sk_test_51N34ghJkL90AcdSfErtYuiOp");
        assert!(e > 3.0);
    }

    #[test]
    fn test_strength_rating() {
        let (label, _) = get_strength_rating(5.0, 64);
        assert_eq!(label, "cryptographically strong");
    }

    #[test]
    fn test_brute_force() {
        let t = estimate_brute_force_time(5.0, 64);
        assert!(!t.is_empty());
    }
}
