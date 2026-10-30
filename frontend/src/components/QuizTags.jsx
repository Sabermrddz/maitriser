/* eslint-disable react/prop-types */
const chipStyle = {
  padding: '2px 10px',
  borderRadius: 12,
  fontSize: 11,
  fontWeight: 600,
  background: 'rgba(251,146,60,0.1)',
  color: '#ea580c',
};

const QuizTags = ({ tags, style }) => {
  if (!tags || tags.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, ...style }}>
      {tags.map((tag, i) => (
        <span key={`${tag}-${i}`} style={chipStyle}>{tag}</span>
      ))}
    </div>
  );
};

export default QuizTags;
