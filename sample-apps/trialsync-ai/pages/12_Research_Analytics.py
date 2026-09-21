import streamlit as st
import pandas as pd
import numpy as np
from utils import ui, auth

ui.set_page("Research Analytics")
auth.require_role("doctor")
ui.page_header("bar-chart", "Research & Sponsor Analytics", "Phase distribution, retention, and enrollment progress across sites.", eyebrow="Sponsor view")

col1, col2 = st.columns(2)

with col1:
    with st.container(border=True):
        ui.section_title("flask", "Trial Phase Distribution")
        chart_data = pd.DataFrame(np.random.randn(20, 3), columns=["Phase 1", "Phase 2", "Phase 3"])
        st.bar_chart(chart_data, color=["#0D9488", "#5EEAD4", "#0A1628"])

with col2:
    with st.container(border=True):
        ui.section_title("trending-up", "Retention Stats (By Site)")
        st.line_chart(np.random.randn(10, 1), color="#0D9488")

st.markdown("")
with st.container(border=True):
    ui.section_title("target", "Enrollment Funnel")
    st.progress(0.75, text="Target Enrollment: 75% Reached")
