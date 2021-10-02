const bcrypt = require('bcryptjs');
const salt = bcrypt.genSaltSync(10);

// Simulate unique shortURL by returning a string of 6 random alphanumeric characters
const generateRandomString = function() {
  let string = Math.random().toString(36).substring(2, 8);
  return string;
};

// Check if user's email exists in database
const findUsersByEmail = function(email, users) {
  for (let userId in users) {
    const user = users[userId];
    if (email === user.email) {
      return user;
    }
  }
  return false;
};

// Create a new user and add them to database
const createUser = function(email, password, users) {
  const userId = generateRandomString();

  users[userId] = {
    id: userId,
    email: email,
    password: bcrypt.hashSync(password, salt)
  };

  return userId;
};

// Check if user credentials are legit
const authenticateUser = function(email, password, users) {
  const userFound = findUsersByEmail(email, users);

  if (userFound) {
    if (bcrypt.compareSync(password, userFound.password)) {
      return userFound;
    }
  }
  return false;
};

module.exports = { generateRandomString, findUsersByEmail, createUser, authenticateUser };