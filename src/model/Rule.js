const { max, min } = require('moment-timezone');
const mongoose = require('mongoose');

const ruleSchema = mongoose.Schema({
   
    ruleName:{
        type:String,
        required:true,
        unique:true,
        maxlength:500,
        minlength:3
    },
    ruleId:{
        type:String,
        uniques:true,
    },
    category: {
    type: String,
    enum: ["increasing", "decreasing", "random","increasingRepeat","decreasingRepeat","increasing-cycling","decreasing-cycling"],
    required:true,
  },
  percentage:{
    type:Number
  },
  amount:{
    type:Number
  },
  interval: {
    type: String,
    required:true
  },
  userName:{
    type:String,
  },
  status: {
    type: String,
    enum: ["created", "updated", "deleted"],
    default: "created",
  },
  mute:{
    type:Boolean,
    default:false,
  }
},{ timestamps: true });


ruleSchema.pre('save', async function (next){
    if(!this.ruleId){
      try {
        const lastRule = await mongoose
        .model("Rule")
        .findOne({})
        .sort({createdAt:-1})
        .select("ruleId");

        let lastNumber = 0;

        if(lastRule && lastRule.ruleId){
            const match = lastRule.ruleId.match(/AP-(\d+)/);
            if(match){
                lastNumber = parseInt(match[1]);
            }
        }
        
        let newNumber = (lastNumber +1).toString().padStart(6,"0");
        if (newNumber.startsWith("0")) {
            newNumber = "55" + newNumber.slice(2); 
          }
        this.ruleId = `AP-${newNumber}`;


      } catch (error) {
        return next(error);
      }
    }
    next();
});
const Rule = mongoose.model("Rule", ruleSchema);

module.exports = Rule;