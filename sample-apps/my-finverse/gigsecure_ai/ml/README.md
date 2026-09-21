# GigSecure AI - Machine Learning Underwriting Engine

Enterprise cash-flow AI credit underwriting system built specifically for India's gig economy workers.

---

## 🏗️ ML Module Architecture

1. **Synthetic Data Generator (`data_generation.py`)**
   - Generates 10,000+ realistic gig partner cash-flow profiles across Zomato, Swiggy, Uber, Ola, Urban Company, Zepto, and Blinkit.

2. **Feature Engineering Pipeline (`feature_engineering.py`)**
   - Computes 15+ financial & operational ratios:
     - Income Velocity & Stability Indexes
     - Fuel & Household Expense Ratios
     - Savings & Debt Service Coverage Ratios
     - Customer Rating & Order Completion Multipliers
     - Cash Flow Stability & Transaction Frequency Indexes

3. **Multi-Model Training & Automated Selection (`train_model.py`)**
   - Trains & compares 4 algorithms:
     1. XGBoost Regressor (`XGBRegressor`)
     2. Random Forest Regressor (`RandomForestRegressor`)
     3. Gradient Boosting Regressor (`GradientBoostingRegressor`)
     4. Ridge Regression (`Ridge`)
   - Auto-selects winner model via 5-Fold Cross Validation & GridSearch hyperparameter tuning.

4. **Risk Classifier (`risk_classifier.py`)**
   - Maps scores (0-100) to Risk Tiers: `LOW`, `MEDIUM`, `HIGH`, `VERY HIGH` with confidence probabilities.

5. **Loan Recommendation Engine (`loan_recommendation.py`)**
   - Multi-tier product recommendations:
     - **Emergency Loan**: Instant fuel / repair cash (1-3 months)
     - **Working Capital Loan**: Operational reserve & insurance (6-12 months)
     - **Business Expansion Loan**: Vehicle upgrade / multi-platform scaling (12-24 months)

---

## 🚀 Training & Evaluation Commands

### 1. Run Data Generation & Model Training
```bash
python ml/train_model.py
```

### 2. Export Metrics JSON
```bash
python ml/evaluate.py
```

### 3. Generate Visualizations (Plots)
```bash
python ml/visualize.py
```

---

## 📊 Exported Artifacts (`ml/artifacts/`)
- `gig_training_data.csv`: 10,000 training records.
- `feature_importance.png`: Feature weight ranking.
- `confusion_matrix.png`: Risk classification accuracy heatmap.
- `income_distribution.png`: Earnings distribution histogram.
- `correlation_matrix.png`: Feature correlation heatmap.
- `prediction_scatter.png`: Actual vs predicted regression fit.
- `metrics.json`: R² Score, MAE, MSE, RMSE, MAPE benchmarks.
