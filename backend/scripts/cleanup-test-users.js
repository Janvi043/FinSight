const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/finsight_db');

  const User = mongoose.model('User', new mongoose.Schema({ email: String, passwordHash: String }));
  const Profile = mongoose.model('Profile', new mongoose.Schema({ userId: mongoose.Schema.Types.ObjectId }));

  const badEmails = /smoke|finaltest|debug|testuser/i;
  const badUsers = await User.find({
    $or: [{ email: badEmails }, { passwordHash: { $not: /^\$2/ } }],
  }).lean();

  for (const user of badUsers) {
    await Profile.deleteMany({ userId: user._id });
  }

  const result = await User.deleteMany({
    $or: [{ email: badEmails }, { passwordHash: { $not: /^\$2/ } }],
  });

  console.log(`Deleted ${result.deletedCount} invalid test users`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
