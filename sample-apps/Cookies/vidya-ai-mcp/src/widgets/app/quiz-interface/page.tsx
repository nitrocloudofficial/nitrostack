'use client';

import { useTheme, useWidgetSDK, useWidgetState } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

interface QuizData {
  topic: string;
  difficulty: string;
  count: number;
  questions: Question[];
}

export default function QuizInterfaceWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<QuizData>();

  const [state, setState] = useWidgetState<{
    currentQuestionIdx: number;
    selectedAnswers: Record<string, number | null>;
    showResults: boolean;
  }>(() => ({
    currentQuestionIdx: 0,
    selectedAnswers: {},
    showResults: false,
  }));

  if (!isReady) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: theme === 'dark' ? '#fff' : '#000',
      }}>
        Initializing...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: theme === 'dark' ? '#fff' : '#000',
      }}>
        Loading...
      </div>
    );
  }

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#000000';
  const borderColor = isDark ? '#333333' : '#e5e7eb';
  const accentBg = isDark ? '#2a2a2a' : '#f0f9ff';
  const accentBorder = isDark ? '#444444' : '#bfdbfe';
  const mutedColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';

  const questions = data.questions ?? [];
  const currentIdx = state?.currentQuestionIdx ?? 0;
  const selectedAnswers = state?.selectedAnswers ?? {};

  if (questions.length === 0) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: mutedColor,
      }}>
        No questions available
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const isAnswered = selectedAnswers[currentQuestion.id] !== undefined && selectedAnswers[currentQuestion.id] !== null;
  const selectedAnswer = selectedAnswers[currentQuestion.id];

  const handleSelectAnswer = (optionIdx: number) => {
    setState({
      ...state,
      selectedAnswers: {
        ...selectedAnswers,
        [currentQuestion.id]: optionIdx,
      },
    });
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setState({
        ...state,
        currentQuestionIdx: currentIdx + 1,
      });
    } else {
      setState({
        ...state,
        showResults: true,
      });
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setState({
        ...state,
        currentQuestionIdx: currentIdx - 1,
      });
    }
  };

  const correctCount = Object.entries(selectedAnswers).filter(([qId, answer]) => {
    const q = questions.find(q => q.id === qId);
    return q && answer === q.correctAnswer;
  }).length;

  const scorePercentage = Math.round((correctCount / questions.length) * 100);

  if (state?.showResults) {
    return (
      <div style={{
        padding: '24px',
        background: bgColor,
        color: textColor,
        borderRadius: '12px',
        maxWidth: '600px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '28px', fontWeight: 'bold' }}>
            🎉 Quiz Complete!
          </h2>
          <div style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: scorePercentage >= 75 ? '#10b981' : scorePercentage >= 50 ? '#f59e0b' : '#ef4444',
            margin: '16px 0',
          }}>
            {scorePercentage}%
          </div>
          <p style={{ margin: '0 0 8px 0', fontSize: '16px', color: mutedColor }}>
            You got <strong>{correctCount}</strong> out of <strong>{questions.length}</strong> correct
          </p>
        </div>

        <div style={{
          padding: '16px',
          background: accentBg,
          border: `1px solid ${accentBorder}`,
          borderRadius: '8px',
          marginBottom: '24px',
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold' }}>
            📊 Performance
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            fontSize: '14px',
          }}>
            <div>
              <p style={{ margin: '0 0 4px 0', color: mutedColor, fontSize: '12px' }}>Correct</p>
              <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
                {correctCount}
              </p>
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', color: mutedColor, fontSize: '12px' }}>Incorrect</p>
              <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#ef4444' }}>
                {questions.length - correctCount}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setState({
            currentQuestionIdx: 0,
            selectedAnswers: {},
            showResults: false,
          })}
          style={{
            width: '100%',
            padding: '12px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#2563eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#3b82f6';
          }}
        >
          Retake Quiz
        </button>
      </div>
    );
  }

  return (
    <div style={{
      padding: '24px',
      background: bgColor,
      color: textColor,
      borderRadius: '12px',
      maxWidth: '700px',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
            📝 {data.topic ?? 'Quiz'}
          </h2>
          <span style={{
            fontSize: '12px',
            color: mutedColor,
            background: accentBg,
            padding: '4px 12px',
            borderRadius: '20px',
          }}>
            {currentIdx + 1} / {questions.length}
          </span>
        </div>

        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '4px',
          background: borderColor,
          borderRadius: '2px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${((currentIdx + 1) / questions.length) * 100}%`,
            background: '#3b82f6',
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {/* Question */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '18px',
          fontWeight: 'bold',
          lineHeight: '1.5',
        }}>
          {currentQuestion.question ?? 'Question'}
        </h3>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {(currentQuestion.options ?? []).map((option, idx) => {
            const isSelected = selectedAnswer === idx;
            const isCorrect = idx === currentQuestion.correctAnswer;
            const showCorrect = isAnswered && isCorrect;
            const showIncorrect = isAnswered && isSelected && !isCorrect;

            return (
              <button
                key={idx}
                onClick={() => handleSelectAnswer(idx)}
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  border: `2px solid ${
                    showCorrect ? '#10b981' :
                    showIncorrect ? '#ef4444' :
                    isSelected ? '#3b82f6' :
                    borderColor
                  }`,
                  background: showCorrect ? 'rgba(16, 185, 129, 0.1)' :
                    showIncorrect ? 'rgba(239, 68, 68, 0.1)' :
                    isSelected ? 'rgba(59, 130, 246, 0.1)' :
                    accentBg,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: textColor,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
                disabled={isAnswered}
                onMouseEnter={(e) => {
                  if (!isAnswered) {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isAnswered) {
                    e.currentTarget.style.borderColor = borderColor;
                    e.currentTarget.style.background = accentBg;
                  }
                }}
              >
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: isSelected ? '#3b82f6' : borderColor,
                  color: isSelected ? 'white' : mutedColor,
                  fontSize: '12px',
                  fontWeight: 'bold',
                  flexShrink: 0,
                }}>
                  {showCorrect ? '✓' : showIncorrect ? '✗' : String.fromCharCode(65 + idx)}
                </span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div style={{
        display: 'flex',
        gap: '12px',
        justifyContent: 'space-between',
      }}>
        <button
          onClick={handlePrev}
          disabled={currentIdx === 0}
          style={{
            padding: '10px 16px',
            background: currentIdx === 0 ? '#d1d5db' : '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: currentIdx === 0 ? 'not-allowed' : 'pointer',
            opacity: currentIdx === 0 ? 0.5 : 1,
          }}
        >
          ← Previous
        </button>

        <button
          onClick={handleNext}
          disabled={!isAnswered}
          style={{
            padding: '10px 16px',
            background: isAnswered ? '#3b82f6' : '#d1d5db',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: isAnswered ? 'pointer' : 'not-allowed',
            opacity: isAnswered ? 1 : 0.5,
          }}
        >
          {currentIdx === questions.length - 1 ? 'Finish' : 'Next'} →
        </button>
      </div>
    </div>
  );
}
