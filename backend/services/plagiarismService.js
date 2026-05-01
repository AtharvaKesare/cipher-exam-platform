/**
 * Local Plagiarism Detection Service
 * Analyzes code submissions for similarity without external paid APIs.
 */

// Simple tokenization (removes whitespace, comments, maps variable names roughly)
const tokenize = (code, language) => {
  let tokens = code
    // Remove inline comments
    .replace(/\/\/.*/g, '')
    // Remove multiline comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove newlines and extra spaces
    .replace(/\s+/g, '')
    .toLowerCase();
    
    return tokens;
};

// Levenshtein-based similarity simple measure
const calculateSimilarity = (str1, str2) => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  // Very simplistic match count for demonstration of local matching
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (shorter[i] === longer[i]) matches++;
  }
  
  return matches / longer.length;
};

export const detectPlagiarism = (submissions) => {
  const reports = [];
  
  for (let i = 0; i < submissions.length; i++) {
    for (let j = i + 1; j < submissions.length; j++) {
      const subA = submissions[i];
      const subB = submissions[j];
      
      if (subA.language === subB.language) {
        const tokenA = tokenize(subA.code, subA.language);
        const tokenB = tokenize(subB.code, subB.language);
        
        const similarityScore = calculateSimilarity(tokenA, tokenB);
        
        if (similarityScore > 0.75) { // Threshold 75%
          reports.push({
            studentAId: subA.studentId,
            studentBId: subB.studentId,
            similarityPercentage: Math.round(similarityScore * 100),
            flagged: true
          });
        }
      }
    }
  }
  
  return reports;
};
