const express = require("express");
const app = express();
const PORT = 8080; // default port 8080

const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cookieSession = require('cookie-session');
const bcrypt = require('bcryptjs');
const salt = bcrypt.genSaltSync(10);

const { generateRandomString, findUsersByEmail, createUser, authenticateUser } = require('./helpers');

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(cookieSession({
  name: 'session',
  keys: ["The best way to encrypt the values"]
}));

// urlDatabase and users list pre-populated with data for assessment
const urlDatabase = {
  "b2xVn2": {
    longURL: "http://www.lighthouselabs.ca",
    userId: "123456"
  },

  "9sm5xK": {
    longURL: "http://www.google.com",
    userId: "987654"
  }
};

const hashedPassword1 = bcrypt.hashSync('123', salt);
const hashedPassword2 = bcrypt.hashSync('321', salt);

const users = {
  "123456": {
    id: "123456",
    email: "user@email.com",
    password: hashedPassword1
  },
  "987654": {
    id: "987654",
    email: "user2@email.com",
    password: hashedPassword2
  }
};

// Returns the list of URLs that belongs to the logged-in user
const urlsForUser = function(id) {
  const results = {};
  const keys = Object.keys(urlDatabase);

  for (const shortURL of keys) {
    const url = urlDatabase[shortURL];

    if (url.userId === id) {
      results[shortURL] = url;
    }
  }
  return results;
};

// Redirecting from default link
app.get("/", (req, res) => {
  const userId = req.session['user_id'];
  const loggedInUser = users[userId];
  if (loggedInUser) {
    return res.redirect('/urls');
  }
  return res.redirect('/login');
});

// The list of URLs displayed to the correct user
app.get('/urls', (req, res) => {
  const userId = req.session['user_id'];
  const loggedInUser = users[userId];

  // Send an error if user is not logged in
  if (!loggedInUser) {
    return res.status(401).send("Please <a href='/login'>login</a> to see the URL list.");
  }

  const urls = urlsForUser(loggedInUser.id);
  const templateVars = { urls: urls, user: loggedInUser };
  res.render("urls_index", templateVars);
});

// Page to create new URLs
app.get("/urls/new", (req, res) => {
  const userId = req.session['user_id'];
  const loggedInUser = users[userId];
  const templateVars = { user: loggedInUser };
  if (loggedInUser) {
    res.render("urls_new", templateVars);
  } else {
    res.redirect('/login');
  }
});

// Creation of new URLs
app.post("/urls", (req, res) => {
  const userId = req.session['user_id'];
  const loggedInUser = users[userId];

  if (!loggedInUser) {
    return res.redirect('/login');
  }

  // Generate shortURL and then log that and longURL to urlDatabase
  const shortURL = generateRandomString();
  const longURL = req.body.longURL;
  urlDatabase[shortURL] = { longURL: longURL, userId: userId };

  res.redirect(`/urls/${shortURL}`);
});

// Accessing the summary page for shortURLs with the right permissions
app.get("/urls/:shortURL", (req, res) => {
  const userId = req.session['user_id'];
  const loggedInUser = users[userId];
  const shortURL = req.params.shortURL;
  const urlExists = shortURL in urlDatabase;

  if (!loggedInUser) {
    return res.redirect('/urls');
  }

  // If url does not exist or url exist but does not match logged in user
  if (!urlExists) {
    return res.status(403).send('This URL does not exist');
  } else if (urlDatabase[shortURL].userId !== loggedInUser.id) {
    console.log(`URL's userID: ${urlDatabase[shortURL].userId} !== Login User: ${loggedInUser.id}`);
    return res.status(403).send('This is not your shortURL');
  }
  const longURL = urlDatabase[req.params.shortURL].longURL;

  const templateVars = { shortURL, longURL, user: loggedInUser };
  res.render("urls_show", templateVars);
});

// Redirect the shortened URL to original longURL
app.get("/u/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  
  // check if shortURL params exist in urlDatabase;
  const urlExists = shortURL in urlDatabase;
  
  if (!urlExists) {
    console.log("shortURL does not exist");
    res.status(403).send("This URL does not exist");
  } else {
    const longURL = urlDatabase[shortURL].longURL;
    res.redirect(longURL);
  }
});

// Registration Page
app.get("/register", (req, res) => {
  const templateVars = { user: null };
  const userId = req.session['user_id'];
  const loggedInUser = users[userId];
  // Show the right pages when user is logged in and logged out
  if (loggedInUser) {
    return res.redirect('/urls');
  }
  res.render("urls_register", templateVars);
});

// Login Page
app.get("/login", (req, res) => {
  const templateVars = { user: null };
  const userId = req.session['user_id'];
  const loggedInUser = users[userId];
  // Show the right pages when user is logged in and logged out
  if (!loggedInUser) {
    res.render("urls_login", templateVars);
  } else {
    res.redirect('/urls');
  }
});

// Delete the shortURL entry
app.post("/urls/:shortURL/delete", (req, res) => {
  const shortURL = req.params.shortURL;
  const userId = req.session['user_id'];
  const loggedInUser = users[userId];

  // If not logged in, display an error message
  if (!loggedInUser) {
    return res.status(403).send('Please log in if you want to delete URL');
  }
  
  // If the url does not belong to user performing the action
  if (urlDatabase[shortURL].userId !== loggedInUser.id) {
    return res.status(403).send('You do not have permission to delete this URL');
  }
  
  delete urlDatabase[shortURL];
  res.redirect(`/urls`);
});

// Update/Edit URL
app.post("/urls/:shortURL", (req, res) => {
  const userId = req.session['user_id'];
  const loggedInUser = users[userId];

  // Only the associated user can see their shortURLs
  if (!loggedInUser) {
    return res.redirect('/urls');
  }

  // extract the shortURL and longURL from form body
  const shortURL = req.params.shortURL;
  const longURL = req.body.longURL;
  
  if (urlDatabase[shortURL].userId !== loggedInUser.id) {
    return res.status(403).send("You can't edit this URL because it's not yours");
  }
  urlDatabase[shortURL] = {longURL, userId};
  res.redirect(`/urls`);
});

// Login Functionality
app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const userFound = findUsersByEmail(email, users);
  
  const user = authenticateUser(email, password, users);

  if (user) {
    // if valid, assign the user_id cookie to match user's ID
    req.session['user_id'] = userFound.id;
    res.redirect(`/urls`);
    return;
  }
    
  res.status(403).send("Wrong credentials");
  
});

// Logout Functionality
app.post("/logout", (req, res) => {
  // clears the user_id cookie
  req.session = null;
  res.redirect(`/urls`);
});

// Register Functionality
app.post("/register", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const userFound = findUsersByEmail(email, users);

  if (userFound) {
    res.status(400).send("Sorry, that user already exists!");
    return;
  }
  
  // Handling registration form errors
  if (email.length === 0 && password.length === 0) {
    res.status(400).send("Please enter your email and password");
    return;
  } else if (email.length === 0) {
    res.status(400).send("Please enter your email");
    return;
  } else if (password.length === 0) {
    res.status(400).send("Please enter your password");
    return;
  }

  // Create new user and assign it with a new cookie session
  const userId = createUser(email, password, users);
  req.session['user_id'] = userId;

  res.redirect('/urls');
});

app.listen(PORT, () => {
  console.log(`myTinyApp listening on port ${PORT}!`);
});