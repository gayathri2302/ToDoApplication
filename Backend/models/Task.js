const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true, 
    maxlength: 50,
    unique:true
  },
  description: { 
    type: String, 
    required: true, 
    maxlength: 500 
  },
  dueDate: { type: Date, default: null },
  completed: { type: Boolean, default: false },
  important: { type: Boolean, default: false },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
});

module.exports = mongoose.model('Task', taskSchema);
