// Required modules import korsi




const express = require('express');

const mongoose = require('mongoose');
const cors = require('cors');

require('dotenv').config();

// Express app create korsi

const app = express();

// CORS setup korsi, allowed origins define korsi


app.use(cors({


  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:5173',
      'https://freelancer-489e7.web.app',

    ];
    if (!origin || allowedOrigins.includes(origin)) {

      callback(null, true);
    } else {

      console.warn(`CORS blocked for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));

    }
  },

  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

// MongoDB connection with retry logic
const connectToMongoDB = async () => {



  let retries = 5;
  while (retries) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,


      });
      console.log('MongoDB te connect hoye gese!');
      break;
    } catch (err) {

      console.error('MongoDB connect korte problem:', err.message);
      retries -= 1;

      if (retries === 0) {
        console.error('Retry shesh, connect hote parlona');
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 sec wait korsi


    }
  }
};
connectToMongoDB();

// Task schema define korsi
const taskSchema = new mongoose.Schema({


  title: { type: String, required: true, minlength: 3 },
  category: { type: String, required: true, enum: ['Web Development', 'Design', 'Writing', 'Marketing'] },
  description: { type: String, required: true, minlength: 10 },
  deadline: { type: Date, required: true },
  budget: { type: Number, required: true, min: 1 },
  userEmail: { type: String, required: true, match: /.+\@.+\..+/ },
  userName: { type: String, required: true, minlength: 2 },
  bidsCount: { type: Number, default: 0, min: 0 },


});

// Bid schema define korsi
const bidSchema = new mongoose.Schema({

  taskId: { type: String, required: true },
  userEmail: { type: String, required: true, match: /.+\@.+\..+/ },
  createdAt: { type: Date, default: Date.now },


});

// Models create korsi

const Task = mongoose.model('Task', taskSchema);
const Bid = mongoose.model('Bid', bidSchema);

// ObjectId valid kina check korar function



const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Health check endpoint for Vercel
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server choltese' });
});

// All tasks fetch korar endpoint


app.get('/api/tasks', async (req, res) => {
  try {
    const { userEmail, limit, sort } = req.query;
    let query = {};
    if (userEmail) query.userEmail = userEmail;
    let tasks = Task.find(query);
    if (sort === 'deadline') tasks = tasks.sort({ deadline: 1 });
    if (limit) tasks = tasks.limit(parseInt(limit));
    const result = await tasks;
    res.json(result);

  } catch (error) {



    console.error('Tasks fetch korte problem:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Single task fetch korar endpoint
app.get('/api/tasks/:id', async (req, res) => {


  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task pai nai' });
    res.json(task);
  } catch (error) {
    console.error('Task fetch korte problem:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }


});

// Task create korar endpoint
app.post('/api/tasks', async (req, res) => {


  try {

    const { title, category, description, deadline, budget, userEmail, userName } = req.body;
    if (!title || !category || !description || !deadline || !budget || !userEmail || !userName) {
      return res.status(400).json({ message: 'Shob field lagbe' });
    }
    const task = new Task(req.body);
    await task.save();
    res.status(201).json(task);

  } catch (error) {

    console.error('Task create korte problem:', error);
    res.status(400).json({ message: error.message });

  }

});

// Task update korar endpoint
app.put('/api/tasks/:id', async (req, res) => {


  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }

    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!task) return res.status(404).json({ message: 'Task pai nai' });
    res.json(task);

  } catch (error) {
    console.error('Task update korte problem:', error);
    res.status(400).json({ message: error.message });
  }


});

// Task delete korar endpoint
app.delete('/api/tasks/:id', async (req, res) => {
  try {


    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }

    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task pai nai' });


    await Bid.deleteMany({ taskId: req.params.id });
    res.json({ message: 'Task delete hoye gese' });
  } catch (error) {


    console.error('Task delete korte problem:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Bids fetch korar endpoint
app.get('/api/bids', async (req, res) => {


  try {
    const { taskId } = req.query;
    if (!taskId || !isValidObjectId(taskId)) {
      return res.status(400).json({ message: 'Valid taskId lagbe' });
    }


    const bids = await Bid.find({ taskId });
    res.json(bids);
  } catch (error) {


    console.error('Bids fetch korte problem:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }



});

// Bid create korar endpoint
app.post('/api/bids', async (req, res) => {

  try {
    const { taskId, userEmail } = req.body;
    if (!taskId || !userEmail) {
      return res.status(400).json({ message: 'taskId and userEmail lagbe' });
    }
    if (!isValidObjectId(taskId)) {
      return res.status(400).json({ message: 'Invalid taskId' });
    }



    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: 'Task pai nai' });
    const bid = new Bid(req.body);
    await bid.save();
    await Task.findByIdAndUpdate(taskId, { $inc: { bidsCount: 1 } });
    res.status(201).json(bid);



  } catch (error) {
    console.error('Bid create korte problem:', error);
    res.status(400).json({ message: error.message });
  }
});

// New endpoint for bids count display (Challenge #1)
app.get('/api/tasks/:id/bids-count', async (req, res) => {
  try {



    // Task ID valid kina check korsi
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }
    // Task find korsi
    const task = await Task.findById(req.params.id);

    if (!task) return res.status(404).json({ message: 'Task pai nai' });
    // Bids count ta pathacchi



    res.json({ message: `You bid for ${task.bidsCount} opportunities` });
  } catch (error) {


    console.error('Bids count fetch korte problem:', error);
    res.status(500).json({ message: 'Server error', error: error.message });


    
  }
});

// Server start korsi
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server choltese port ${PORT} e`));