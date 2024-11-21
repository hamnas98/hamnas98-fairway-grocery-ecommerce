const homePage = async (req, res) => {
    try {
        res.render('home');
    } catch (error) {
        res.status(500).json({ message: 'Error loading home page', error });
        console.log('home page error');
    }
  };
  
  const signupPage = async (req, res) => {
    try {
        res.render('signup', {
            errors: [],
            oldInput: {},
        });
    } catch (error) {
        res.status(500).json({ message: 'Error loading Signup page', error });
        console.log('Signup page error');
    }
  };
  

  
  const page404 = async (req, res) => {
    try {
        res.render('404');
    } catch (error) {
        res.status(500).json({ message: 'Error loading 404 page', error });
        console.log('404 page error');
    }
  };
  
  module.exports = { homePage, page404, signupPage };
  