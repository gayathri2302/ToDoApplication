const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const validator = require('validator');

// Middleware to validate and sanitize task data
const validateTask = (req, res, next) => {

  console.log(req.body, "before the validation");

  let tasks = req.body;

  if (tasks && typeof tasks === 'object') {
    tasks = [tasks];
  }

  console.log(tasks);

  const errors = [];

  tasks.forEach((task, index) => {
    const {
      title = '',
      description = '',
      dueDate = '',
      completed = false,
      priority = '',
      important = false
    } = task;

    // Validate title
    if (!title) {
      errors.push({ index, field: 'title', message: 'Title is required' });
    } else if (title.length > 50) {
      errors.push({ index, field: 'title', message: 'Title cannot exceed 50 characters' });
    }

    // Validate description
    if (!description) {
      errors.push({ index, field: 'description', message: 'Description is required' });
    } else if (description.length > 500) {
      errors.push({ index, field: 'description', message: 'Description cannot exceed 500 characters' });
    }

    // Validate priority
    const validPriorities = ['high', 'medium', 'low'];
    if (!validPriorities.includes(priority)) {
      errors.push({ index, field: 'priority', message: `Priority must be one of ${validPriorities.join(', ')}` });
    }

    // Validate importance
    if (important !== true && important !== false) {
      errors.push({ index, field: 'important', message: 'Importance must be either true or false' });
    }

    // Validate completed
    if (completed !== true && completed !== false) {
      errors.push({ index, field: 'completed', message: 'completed must be either true or false' });
    }

    // Validate dueDate format (YYYY-MM-DD)
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      errors.push({ index, field: 'dueDate', message: 'DueDate must be in YYYY-MM-DD format' });
    }
  });

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  // If no errors, proceed to next middleware
  req.body = tasks; // Ensure req.body is set to the array of tasks
  next();
};

// Middleware to validate and sanitize search and filter requests
const validateSearchRequest = (req, res, next) => {
  const { search, sortBy, page, limit, priority, completed } = req.body;

  // Validate search input
  if (search !== undefined) {
    if (typeof search !== 'string') {
      return res.status(400).json({ error: 'Search must be a string' });
    }
    // Sanitize search string
    req.body.search = validator.escape(search);
    // Optionally, trim search string or set a max length
    req.body.search = req.body.search.trim().substring(0, 100); // Example: max 100 characters
  }

  // Validate priority
  if (priority !== undefined && priority !== '') {
    const validPriorities = ['high', 'medium', 'low'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ error: `Priority must be one of ${validPriorities.join(', ')}` });
    }
  }

  // Validate completed
  if (completed !== undefined) {
    if (completed !== 'true' && completed !== 'false') {
      return res.status(400).json({ error: 'completed must be either "true" or "false"' });
    }
    req.body.completed = completed === 'true'; // Convert to boolean
  }

  // Validate pagination parameters
  if (page !== undefined) {
    const pageNumber = Number(page);
    if (isNaN(pageNumber) || pageNumber <= 0) {
      return res.status(400).json({ error: 'Page must be a positive number' });
    }
  }

  if (limit !== undefined) {
    const limitNumber = Number(limit);
    if (isNaN(limitNumber) || limitNumber <= 0) {
      return res.status(400).json({ error: 'Limit must be a positive number' });
    }
  }

  // Validate sortBy
  if (sortBy !== undefined) {
    const [key, order] = sortBy.split(':');
    const validSortFields = ['title', 'description', 'dueDate', 'priority', 'createdAt']; // Example valid fields

    if (!validSortFields.includes(key) || (order !== 'asc' && order !== 'desc')) {
      return res.status(400).json({ error: 'sortBy must be in the format <field>:<asc|desc>' });
    }
  }

  // Proceed to next middleware
  next();

};

// Create a new task
router.post('/postTask', validateTask, async (req, res) => {

  try {

    console.log(req.body, "after the validation of request");

    const tasks = req.body;

    console.log(tasks);

    console.log(req.body);

    // Create an array to hold newly created tasks
    const createdTasks = [];

    // Process each task in the array
    for (const taskData of tasks) {
      const { title, description, dueDate, completed, priority, important } = taskData;

      // Check if a task with the same title already exists
      const existingTask = await Task.findOne({ title });
      if (existingTask) {
        return res.status(400).json({ error: 'Task with this title already exists' });
      }

      // Create a new task instance and save it to the database
      const task = new Task({
        title,
        description,
        dueDate,
        completed,
        priority,
        important
      });

      await task.save();
      createdTasks.push(task);
    }

    // Respond with the list of created tasks
    res.status(201).json(createdTasks);
  } catch (error) {
    // Handle any errors that occur during task creation
    res.status(400).json({ error: error.message });
  }
});

// Update an existing task
router.patch('/update', async (req, res) => {
  try {

    console.log(req.body);

    const { id, title, description, dueDate, completed, important, priority } = req.body;

    // Check if id is provided
    if (!id) {
      return res.status(400).json({ error: 'Task ID is required' });
    }

    // Find and update the task
    const task = await Task.findByIdAndUpdate(
      id,
      { title, description, dueDate, completed, important, priority },
      { new: true }
    );

    // If the task was not found, return a 404 error
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Respond with the updated task
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all tasks
router.post('/getTask', validateSearchRequest, async (req, res) => {

  const { search, sortBy, page = 1, limit = 10, filterCriteria } = req.body;

  console.log(req.body);


  try {
    let query = {};

    // Handle search by title or description
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }

    if (filterCriteria) {

      const { priority, important, dueDate } = filterCriteria;

      console.log(priority, important, dueDate);


      // Filter by priority
      if (priority) {
        query.priority = priority;
      }

      // Filter by completion status
      if (important !== undefined) {
        query.important = important === 'true';
      }
    }

    // Fetch all tasks that match the search and filter criteria
    const tasks = await Task.find(query);

    // Sorting options
    let sortOption = {};
    if (sortBy) {
      const [key, order] = sortBy.split(':');
      sortOption[key] = order === 'desc' ? -1 : 1;
    } else {
      // Default sorting by dueDate
      sortOption.dueDate = -1;
    }

    // Sort the entire dataset
    const sortedTasks = tasks.sort((a, b) => {
      for (let key in sortOption) {
        if (sortOption[key] === 1) {
          if (a[key] > b[key]) return 1;
          if (a[key] < b[key]) return -1;
        } else if (sortOption[key] === -1) {
          if (a[key] < b[key]) return 1;
          if (a[key] > b[key]) return -1;
        }
      }
      return 0;
    });

    // Pagination skip value
    const skip = (page - 1) * limit;

    // Paginate the sorted dataset
    const paginatedTasks = sortedTasks.slice(skip, skip + limit);

    // Get total count of matching tasks
    const totalTasks = sortedTasks.length;

    // Respond with tasks and pagination info
    res.json({
      tasks: paginatedTasks,
      totalTasks,
      totalPages: Math.ceil(totalTasks / limit),
      currentPage: Number(page),
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching tasks' });
  }
});

// Delete a task by ID
router.delete('/delete', async (req, res) => {
  try {

    console.log(req.body);

    const { id } = req.body;

    console.log(id);

    // Check if id is provided
    if (!id) {
      return res.status(400).json({ error: 'Task ID is required' });
    }

    const task = await Task.findByIdAndDelete(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting task' });
  }
});

module.exports = router;
