# 📊 Financial Dataset 📊

> A comprehensive dataset for financial analysis, containing key financial statements, ratios, and metrics for various companies.

## 📝 Dataset Summary

This dataset includes various financial statements, metrics, and pricing data. It is organized into multiple CSV files, each covering specific financial aspects for ease of analysis.

---

## 🗂 Directory Structure

```plaintext
dataset/
│
├── Annual_P_L_1_final.csv
├── Annual_P_L_2_final.csv
├── Balance_Sheet_final.csv
├── Quarter_P_L_1_final.csv
├── Quarter_P_L_2_final.csv
├── cash_flow_statments_final.csv
├── other_metrics_final.csv
├── price_final.csv
├── ratios_1_final.csv
├── ratios_2_final.csv
└── t1_prices.csv
```

---

---

---

## 📁 File Descriptions

- **Annual_P_L_1_final.csv**  
  Contains annual profit and loss data for a subset of companies.

- **Annual_P_L_2_final.csv**  
  Additional annual profit and loss data for the same subset of companies.

- **Balance_Sheet_final.csv**  
  Includes the balance sheet information for companies, detailing assets, liabilities, and equity.

- **Quarter_P_L_1_final.csv**  
  Quarterly profit and loss data for a subset of companies.

- **Quarter_P_L_2_final.csv**  
  Additional quarterly profit and loss data for the same subset of companies.

- **cash_flow_statments_final.csv**  
  Cash flow statements providing details on cash inflows and outflows.

- **other_metrics_final.csv**  
  Contains additional financial metrics such as market capitalization, sales growth, and promoter holding changes.

- **price_final.csv**  
  Pricing data, including historical stock prices for various companies.

- **ratios_1_final.csv**  
  Key financial ratios for a subset of companies.

- **ratios_2_final.csv**  
  Additional financial ratios for the same subset of companies.

- **t1_prices.csv**  
  Contains market price data at timestamp **T1**, enabling comparison with other datasets that reflect financial data at timestamp **T0**.

---

## 🎯 Intended Use

The dataset is designed for the following applications:

- **Financial Analysis**: Evaluate company performance using profit and loss data, balance sheets, and cash flow statements.
- **Stock Market Research**: Analyze price trends and financial ratios to identify investment opportunities.
- **Corporate Benchmarking**: Compare financial metrics across companies to identify strengths and weaknesses.
- **Model Development**: Train machine learning models for stock price prediction, risk assessment, and profitability analysis.
- **Time-Series Analysis**: Compare metrics between timestamps **T0** (financial data) and **T1** (market price data) to understand trends over time.

---

## 🚀 Usage Instructions

### 1. Download the Dataset

Download the dataset to your local system.

### 2. Prepare the Data

Ensure the CSV files are placed in the `data_01_07_2024/` folder.

### 3. Load the Data

Use libraries like `pandas` or `numpy` to load the data for preprocessing and analysis. For example:

```python
import pandas as pd

# Load Balance Sheet data (T0)
balance_sheet_data = pd.read_csv('data_01_07_2024/Balance_Sheet_final.csv')
print(balance_sheet_data.head())

# Load T1 pricing data
t1_prices_data = pd.read_csv('data_01_07_2024/t1_prices.csv')
print(t1_prices_data.head())

```

---
