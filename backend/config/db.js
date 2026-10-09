const mongoose = require("mongoose");

const { MongoMemoryServer } = require("mongodb-memory-server");

const connectDB = async () => {
  try {
    let uri = process.env.MONGO_URI;

    if (!uri) {
      console.log("MONGO_URI not provided — starting in-memory MongoDB for local testing...");
      const mongod = await MongoMemoryServer.create();
      uri = mongod.getUri();
      // keep reference so it doesn't get GC'd
      connectDB.__mongod = mongod;
    }

    const conn = await mongoose.connect(uri, { dbName: process.env.MONGO_DB_NAME || undefined });

    console.log(`✅ MongoDB Connected`);
    console.log(`Database: ${conn.connection.name}`);
  } catch (error) {
    console.log("❌ MongoDB Connection Failed");
    console.log(error.message);
    process.exit(1);
  }
};

module.exports = connectDB;