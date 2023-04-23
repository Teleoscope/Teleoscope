import authDecorator from '../../../middlewares/authDecorator';

export default authDecorator(async (req, res) => {
    res.json({"grouppalette": "in api call"});
});
  