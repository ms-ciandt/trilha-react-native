import React, { useState } from 'react';
import styles from './styles.module.css';

const LABELS = {
  en: {
    correct: 'Correct!',
    incorrect: 'Not quite.',
    next: 'Next →',
    finish: 'See Results',
    done: 'Quiz Complete',
    score: (s, t) => `${s} out of ${t}`,
    restart: 'Try Again',
  },
  pt: {
    correct: 'Correto!',
    incorrect: 'Não exatamente.',
    next: 'Próxima →',
    finish: 'Ver Resultado',
    done: 'Quiz Concluído',
    score: (s, t) => `${s} de ${t}`,
    restart: 'Tentar Novamente',
  },
};

// Supports two option formats:
//   legacy:  options: string[]  +  rationale: string  (correct answer only)
//   rich:    options: Array<{text: string, rationale: string}>
function getOptionText(opt) {
  return typeof opt === 'string' ? opt : opt.text;
}
function getOptionRationale(opt) {
  return typeof opt === 'string' ? null : (opt.rationale ?? null);
}

export default function Quiz({ questions, lang = 'en' }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [finished, setFinished] = useState(false);

  const L = LABELS[lang] ?? LABELS.en;
  const q = questions[current];
  const isAnswered = selected !== null;
  const isLast = current + 1 >= questions.length;
  const isCorrect = selected === q.correctIndex;

  function handleSelect(idx) {
    if (isAnswered) return;
    setSelected(idx);
    setAnswers(prev => [...prev, idx === q.correctIndex]);
  }

  function handleNext() {
    if (isLast) {
      setFinished(true);
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
    }
  }

  function handleRestart() {
    setCurrent(0);
    setSelected(null);
    setAnswers([]);
    setFinished(false);
  }

  if (finished) {
    const score = answers.filter(Boolean).length;
    return (
      <div className={styles.quiz}>
        <div className={styles.result}>
          <h2>{L.done}</h2>
          <div className={styles.score}>{L.score(score, questions.length)}</div>
          <button className={styles.restartBtn} onClick={handleRestart}>{L.restart}</button>
        </div>
      </div>
    );
  }

  const progress = (current / questions.length) * 100;

  // Rationale to show: per-option if rich format, else fallback to q.rationale
  const shownRationale = isAnswered
    ? (getOptionRationale(q.options[selected]) ?? q.rationale ?? null)
    : null;

  return (
    <div className={styles.quiz}>
      <div className={styles.header}>
        <span className={styles.counter}>{current + 1} / {questions.length}</span>
      </div>
      <div className={styles.progress}>
        <div className={styles.progressBar} style={{ width: `${progress}%` }} />
      </div>
      <p className={styles.question}>{q.question}</p>
      <div className={styles.options}>
        {q.options.map((opt, idx) => {
          let cls = styles.option;
          if (isAnswered) {
            if (idx === q.correctIndex) cls += ' ' + styles.correct;
            else if (idx === selected) cls += ' ' + styles.incorrect;
            else cls += ' ' + styles.faded;
          }
          return (
            <button
              key={idx}
              className={cls}
              onClick={() => handleSelect(idx)}
              disabled={isAnswered}
            >
              <span className={styles.prefix}>{String.fromCharCode(65 + idx)}.</span>
              <span>{getOptionText(opt)}</span>
            </button>
          );
        })}
      </div>
      {isAnswered && shownRationale && (
        <div className={styles.rationale}>
          <strong>{isCorrect ? L.correct : L.incorrect}</strong>{' '}
          {shownRationale}
        </div>
      )}
      {isAnswered && (
        <button className={styles.nextBtn} onClick={handleNext}>
          {isLast ? L.finish : L.next}
        </button>
      )}
    </div>
  );
}
