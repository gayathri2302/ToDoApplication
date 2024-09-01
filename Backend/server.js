// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json()); 


const tasksRouter = require('./routes/tasks');

// Connect to MongoDB
mongoose.connect('mongodb+srv://gayathrirangaraju44970:Gayathri23@cluster0.0skz6w4.mongodb.net/mydatabase?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Routes
app.use('/api/tasks', tasksRouter);

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
