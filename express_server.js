const express = require("express");
const app = express();
const PORT = 8080; // default port 8080

const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cookieSession = require('cookie-session');
const bcrypt = require('bcryptjs');
const salt = bcrypt.genSaltSync(10);

app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(cookieSession({
  name: 'session',
  keys: ["The best way to encrypt the values"]
}))

app.set("view engine", "ejs");

// Simulate unique shortURL by returning a string of 6 random alphanumeric characters
function generateRandomString() {
  let string = Math.random().toString(36).substring(2, 8);
  return string;
}

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

// In order to test dummy users
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
}

// Test to see if hashed password works
// console.log(salt, users);

// Create user logic function
const findUsersByEmail = function (email, users) {
  for (let userId in users) {
    const user = users[userId];
    if (email === user.email) {
      return user;
    }
  }
  return false;
}

// New helper function?
const createUser = function (email, password, users) {
  const userId = generateRandomString();

  // add to user database
  users[userId] = {
    id: userId,
    email: email, 
    password: bcrypt.hashSync(password, salt)
  };

  return userId;
}

const authenticateUser = function (email, password, users) {
  const userFound = findUsersByEmail(email, users);

  if (userFound) {
    if (bcrypt.compareSync(password, userFound.password)){
      return userFound;
    }
  }
  return false;
};

// Create function that returns the URLs where userID is equal to id of logged-in user
const urlsForUser = function (id) {
  const results = {};
  const keys = Object.keys(urlDatabase);

  for (const shortURL of keys){
    const url = urlDatabase[shortURL];

    if (url.userId === id) {
      results[shortURL] = url;
    }
  }
  return results;
}

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

// change from url to urls
app.get('/urls', (req, res) => {
  const userId = req.session['user_id'];
  // console.log({userId});
  const loggedInUser = users[userId];
  // Send an error if user is not logged in
  if (!loggedInUser) {
    return res.status(401).send("Please <a href='/login'>login</a> to see the URL list.");
  }

  // Only show urls for the user that's logged in
  const urls = urlsForUser(loggedInUser.id);

  const templateVars = { urls: urls, user: loggedInUser };
  res.render("urls_index", templateVars)
})
 
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

app.post("/urls", (req, res) => {
  
  const userId = req.session['user_id'];
  const loggedInUser = users[userId];

  if (!loggedInUser) {
    return res.redirect('/login');
  };
  // Generate shortURL and then log that and longURL to urlDatabase
  const shortURL = generateRandomString();
  const longURL = req.body.longURL;
  urlDatabase[shortURL] = { longURL: longURL, userId: userId };

  // Redirect page to shortURL
  res.redirect(`/urls/${shortURL}`);
});

app.get("/urls/:shortURL", (req, res) => {
  const userId = req.session['user_id'];
  const loggedInUser = users[userId];
  const shortURL = req.params.shortURL;
  const urlExists = shortURL in urlDatabase; 

  if (!loggedInUser){
    return res.redirect('/urls');
  }

  // If url does not exist or url exist but does not match logged in user
  if (!urlExists) {
    return res.status(403).send('This URL does not exist');
  } else if (urlDatabase[shortURL].userId !== loggedInUser.id) {
    console.log(`URL's userID: ${urlDatabase[shortURL].userId} !== Login User: ${loggedInUser.id}`)
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
  
  if(!urlExists) {
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
})

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
})

// Delete the shortURL entry
app.post("/urls/:shortURL/delete", (req, res) => {
  const shortURL = req.params.shortURL;
  const userId = req.session['user_id'];
  const loggedInUser = users[userId];
  
  // If the url does not belong to user performing the action
  if (urlDatabase[shortURL].userId !== loggedInUser.id) {
    // console.log(`${urlDatabase[shortURL].userId} !== ${loggedInUser.id}`)
    return res.status(403).send('You do not have permission to delete this URL');
  }
  
  // Delete and redirect back to URLs page
  delete urlDatabase[shortURL];
  res.redirect(`/urls`);
})

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
  // update the longURL content in the db associated with that shortURL
  urlDatabase[shortURL] = {longURL, userId};

  res.redirect(`/urls`);
})

// Login Functionality
app.post("/login", (req, res) => {
  // Get user info from form
  const email = req.body.email;
  const password = req.body.password;
  const userFound = findUsersByEmail(email, users);
  
  const user = authenticateUser(email, password, users);

  // compare password with the email
  if (user) {
    // if valid, assign the user_id cookie to match user's ID
    req.session['user_id'] = userFound.id;

    // Redirect back to urls
    res.redirect(`/urls`);
    return;
  } 
    
  res.status(403).send("Wrong credentials");
  
})

// Logout Functionality
app.post("/logout", (req, res) => {
  // clears the user_id cookie
  req.session = null;
  // Redirect back to urls
  res.redirect(`/urls`); 
})

// Register Functionality
app.post("/register", (req, res) => {
  // get user info such as email, password and randomly generated userID
  const email = req.body.email;
  const password = req.body.password;
  // const hashedPassword = bcrypt.hashSync(password, salt);
  // const userId = generateRandomString();
  
  // check if user exist already, if yes send an error, else proceed
  const userFound = findUsersByEmail(email, users);

  if(userFound) {
    res.status(400).send("Sorry, that user already exists!");
    return;
  }
  
  // Registration Form Error Handling
  if(email.length === 0 && password.length === 0) {
    res.status(400).send("Please enter your email and password");
    return;
  } else if (email.length === 0) {
    res.status(400).send("Please enter your email");
    return;
  } else if (password.length === 0) {
    res.status(400).send("Please enter your password");
    return;
  }

  // console.log(userFound);

  const userId = createUser(email, password, users);
  
  // add to user database
  // users[userId] = {
  //   id: userId,
  //   email: email, 
  //   password: bcrypt.hashSync(password, salt)
  // };

  // set user_id cookie to be newly generated ID
  // req.session('user_id', userId);
  req.session['user_id'] = userId;

  // redirect to /urls
  res.redirect('/urls');
})


app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});