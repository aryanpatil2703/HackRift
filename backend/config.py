import os

# Cycle Detection
CYCLE_MIN_LEN = int(os.getenv("CYCLE_MIN_LEN", "3"))
CYCLE_MAX_LEN = int(os.getenv("CYCLE_MAX_LEN", "5"))

# Smurfing Detection
SMURF_WINDOW_HOURS = int(os.getenv("SMURF_WINDOW_HOURS", "72"))
SMURF_THRESHOLD = int(os.getenv("SMURF_THRESHOLD", "10"))

# Layered Shells
SHELL_MIN_TX = int(os.getenv("SHELL_MIN_TX", "2"))
SHELL_MAX_TX = int(os.getenv("SHELL_MAX_TX", "3"))

# Whitelist
WHITELIST_FILE = os.getenv("WHITELIST_FILE", "whitelist.json")
