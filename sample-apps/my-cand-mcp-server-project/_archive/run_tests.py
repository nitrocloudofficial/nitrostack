import unittest
import sys

def main():
    print("Discovering and running Candidate Transformer tests...")
    loader = unittest.TestLoader()
    suite = loader.discover("tests")
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    if not result.wasSuccessful():
        sys.exit(1)
    else:
        print("\nAll Candidate Transformer tests executed successfully!")
        sys.exit(0)

if __name__ == "__main__":
    main()
