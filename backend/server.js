const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv").config();
const path = require("path");

require("dotenv").config();

const app = express();

//midlewares
app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
res.send('API is working ');
});


//mongodb connection 
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("mongodb connected"))
    .catch((err) => console.error("mongo error",err));

//test route
const PORT = process.env.PORT || 5000;
app.listen(PORT,() =>{
    console.log(`server running on port ${process.env.PORT}`);

});

const authRoutes = require('./routes/auth');
const userRoutes = require("./routes/user");
const propertyRoutes = require("./routes/properties");
const favoritesRoutes = require('./routes/favorites');
const messageRoutes = require("./routes/messages");
const interestRoutes = require("./routes/interests");
const appointmentRoutes = require("./routes/appointments");
const notificationRoutes = require("./routes/notifications");


app.use('/api/auth', authRoutes); // για /api/register
app.use("/api/user", userRoutes);
app.use("/api/properties", propertyRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/interests", interestRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/uploads", express.static(path.join(__dirname,'uploads'))); // για να σερβίρει τα αρχεία από τον φάκελο uploads 
