const Interest = require("../models/interests");

//submit interest 

exports.submitInterest = async (req, res) =>{
    const tenantId = req.user.userId;
    const{propertyId, message} = req.body;

    try{
        const existing = await Interest.findOne({tenantId, propertyId});
        if(existing) return res.status(400).json({message:"Interest already submitted for selected property"});
    
        const interest = new Interest({tenantId, propertyId, message});
        await interest.save();
        res.status(200).json({message: "interest submitted"});

    }catch(err){
        res.status(500).json({message: "server error"});
    }
};

//get interests
exports.getInterests = async(req , res) =>{
    const tenantId = req.user.userId;
    try{
        const interests =  await Interest.find({tenantId}).populate("propertyId");
        res.json(interests);
    
    }catch(err){
        res.status(500).json({message: "server error"});
    }
};
//update interests 

exports.updateInterestStatus = async (req, res) => {
  const { status } = req.body;
  try {
    const interest = await Interest.findByIdAndUpdate(
      req.params.interestId,
      { status },
      { new: true }
    );
    res.json({ message: "Updated", interest });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};