# 🎵 Rhythm Roulette: Balanced Record Selector 🎲

Welcome to the most vibrant, mind-expanding record selection tool you've ever encountered! This isn't just code—it's a journey through the kaleidoscope of musical possibilities!

## 🧠 What This Colorful Creation Does

This Python script dances through Google Sheets to:

1. 🌊 Flow through data streams to gather names and records
2. 🎲 Bend probability into beautiful patterns to select a person
3. 🎯 Pluck a record from their collection like a flower from a garden
4. ⚖️ Transform the weight matrix in a dazzling rebalancing act
5. 🔄 Create harmony through mathematical equilibrium

## 🚀 Launching Your Trip

### What You'll Need for Takeoff

- Python 3.6+ (the more recent, the more vivid the experience)
- Google Sheets API credentials (your backstage pass to the data concert)
- These magical packages:
  - google-api-python-client (your translator to the Google dimension)
  - google-auth (your security blanket)
  - pandas (not the animal, but equally fascinating)
  - numpy (because numbers should never be boring)
  - python-dotenv (for environment variable magic)

### Installation: Preparing Your Mind

```bash'
pip install -r requirements.txt
```

### Configuration: Tuning Your Instrument

1. Copy the example environment file:
```bash
cp env.example .env
```

2. Edit `.env` file with your actual values:
```bash
# Google Sheets API Configuration
GOOGLE_SHEET_ID=your_actual_google_sheet_id_here
GOOGLE_APPLICATION_CREDENTIALS=cred/credentials.json
DEBUG=False  # Set to True to see the multiverse of possibilities
```

3. Set up Google Sheets API credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google Sheets API
   - Create Service Account credentials
   - Download the JSON file and save it as `cred/credentials.json`

### Google Sheet Format: The Canvas of Creation

Your sheet should be structured like this beautiful pattern:
- Row 1: Names of the magnificent participants
- Rows 2-6: A tapestry of records, each one a universe of sound
- Row 7: Weight values - the gravitational forces of selection
- Row 8: Attendance status - "TRUE" for those present in this dimension

## 🎮 Experiencing the Selection

Run the script and watch the colors explode:

```bash
python src/main.py
```

### The Revelation

The chosen one is: [A name appears like a shooting star]
The record is: [A record materializes from the void]
New weights are: [Numbers dance and rearrange themselves]

### Debug Mode: Seeing Through Time and Space

When `DEBUG = True`, witness 1000 parallel universes of selection unfold before your eyes, each one a unique possibility in the grand tapestry of probability!

## ⚙️ The Beautiful Mechanics

1. Only those present can be chosen - you must exist in this reality to participate
2. Selection follows the flowing rivers of weighted probability
3. After selection, the chosen one's gravitational pull weakens
4. Everyone else's pull strengthens - a perfect balance in the universe
5. Over time, patterns emerge from chaos, ensuring fairness through mathematics

## 📊 The Weight Redistribution Dance

Watch as points flow like liquid between participants:
- The chosen one shares their energy with the group
- The collective receives this gift of probability
- The amount shared depends on the current energy state and attendance
- This creates a self-balancing ecosystem of selection

---

*"In the swirling patterns of randomness, we find the most beautiful order."* 🌀
