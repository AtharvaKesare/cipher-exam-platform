import 'dotenv/config';
import mongoose from 'mongoose';
import Exam from './models/Exam.js';
import Question from './models/Question.js';

await mongoose.connect(process.env.MONGO_URI);
console.log('Connected to MongoDB');

// List all exams
const exams = await Exam.find({}).populate('questions');
console.log('\nAll exams:');
exams.forEach((e, i) => {
  console.log(`  ${i+1}. "${e.title}" (${e._id}) — ${e.questions?.length || 0} questions linked`);
});

// Seed questions into EVERY exam
for (const exam of exams) {
  // Clear old questions for this exam
  await Question.deleteMany({ examId: exam._id });

  const questions = [
    {
      examId: exam._id,
      title: 'Sum of Two Numbers',
      description: 'Write a Python program that prints the sum of 3 + 7.\n\nExpected Output: 10',
      difficulty: 'easy',
      allowedLanguages: ['python'],
      expectedOutput: '10'
    },
    {
      examId: exam._id,
      title: 'Reverse a String',
      description: 'Write a JavaScript program that reverses the string "Hello, World!" and prints it.\n\nExpected Output: !dlroW ,olleH',
      difficulty: 'easy',
      allowedLanguages: ['javascript'],
      expectedOutput: '!dlroW ,olleH'
    },
    {
      examId: exam._id,
      title: 'Find High Earners',
      description: 'Write an SQL query to find employees with salary greater than 60000.\n\nYou are given a table called `employees`.\n\n### Table: employees\n\n| id | name | salary | department |\n|----|-------|--------|------------|\n| 1 | John | 50000 | HR |\n| 2 | Alice | 70000 | IT |\n| 3 | Bob | 60000 | Finance |\n| 4 | Eve | 80000 | IT |\n\n### Task:\nWrite an SQL query to find employees with salary greater than 60000.',
      difficulty: 'easy',
      allowedLanguages: ['sql'],
      expectedOutput: 'Alice\nEve'
    }
  ];

  const created = await Question.insertMany(questions);
  await Exam.updateOne({ _id: exam._id }, { $set: { questions: created.map(q => q._id) } });
  console.log(`\\n✅ Seeded 3 questions (SQL, Python, JS) into exam: "${exam.title}"`);
}

await mongoose.disconnect();
console.log('\nDone!');
process.exit(0);
