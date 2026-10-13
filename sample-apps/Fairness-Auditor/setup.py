from setuptools import setup, find_packages

setup(
    name="afo-orchestrator",
    version="0.1.0",
    packages=find_packages(include=["orchestrator", "orchestrator.*"]),
    install_requires=[],
)
