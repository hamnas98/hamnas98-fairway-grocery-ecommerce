

const homePage = async (req, res) => {
  try {
    res.render('home',);
  } catch (error) {
    res.status(500).json({ message: 'Error loading home page', error });
  }
};

module.exports = { homePage };
