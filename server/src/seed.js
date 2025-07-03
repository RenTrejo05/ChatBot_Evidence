const path = require('path');
const { connectDB } = require('./lib/mongodb');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const newMedicines = require('../data/medicamentos.json');

/**
 * Seeds the 'medicamentos' collection by upserting new medicines.
 * Existing documents are preserved; only new ones are added.
 */
(async () => {
  try {
    const db = await connectDB();
    const collection = db.collection('medicamentos');

    for (const medicine of newMedicines) {
      await collection.updateOne(
        { nombre: medicine.nombre }, // filter by name
        { $setOnInsert: medicine },  // insert only if not exists
        { upsert: true }
      );
      console.log(`${medicine.nombre} added or already exists`);
    }

    console.log('Seed completed: new medicines added without deleting existing ones.');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
})();
