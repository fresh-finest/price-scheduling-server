const Product = require("../model/Product");

const Tag = require("../model/Tag");

// exports.createTag = async (req, res) => {
//   try {
//     const tag = await Tag.create(req.body);
//     res.status(201).json({ tag });
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// };
exports.createTag = async (req, res) => {
  try {
    const tag = await Tag.create(req.body);
    res.status(201).json({ tag });
  } catch (error) {
    if (error.code === 11000) {
      // Handle duplicate key error
      const field = Object.keys(error.keyValue)[0];
      res.status(400).json({ error: `${field} must be unique` });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
};

exports.getTag = async (req, res) => {
  try {
    const tag = await Tag.find();
    res.status(200).json({ tag });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateTag = async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  
  try {
    const oldTag = await Tag.findById({ _id: id });

    if (!oldTag) {
      return res.status(404).json({ message: "Tag not found" });
    }

 
    if (data.colorCode && data.colorCode !== oldTag.colorCode) {
      const oldColorCode = oldTag.colorCode;
      const newColorCode = data.colorCode;

      console.log(data.tagName);
      await Product.updateMany(
        { "tags.colorCode": oldColorCode },
        { $set: { "tags.$[elem].colorCode": newColorCode } },
        { arrayFilters: [{ "elem.colorCode": oldColorCode }] }
      );
    }
   
    if (data.tagName && data.tagName !== oldTag.tagName) {
      const oldTagName = oldTag.tagName;
      const newTagName = data.tagName;
      console.log("tag name"+data.tagName+ "old tag "+oldTagName);
      await Product.updateMany(
        { "tags.tag": oldTagName },
        { $set: { "tags.$[elem].tag": newTagName } },
        { arrayFilters: [{ "elem.tag": oldTagName }] }
      );
    }

    const updatedTag = await Tag.findByIdAndUpdate({ _id: id }, req.body, {
      new: true,
    });

    res.status(200).json({ tag: updatedTag });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteTag = async (req, res) => {
  const { id } = req.params;

  try {
    const tag = await Tag.findById({ _id: id });
    if (!tag) {
      return res.status(404).json({ message: "Tag not found" });
    }

    const { tagName} = tag;
    await Product.updateMany(
      { "tags.tag": tagName },
      { $pull: { tags: { tag: tagName } } }
    );
    await Tag.findByIdAndDelete({ _id: id });
    res.status(200).json({ message: "Tag deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

