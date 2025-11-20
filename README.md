# Insured Mine - Node.js Backend

This repository contains the backend implementation for **Insured Mine**, built using **Node.js** and **Express.js**.
It provides a set of APIs for managing customer data, with routes organized for scalability and maintainability.

---

## Features

- RESTful API architecture
- MongoDB integration
- Centralized error handling
- Environment variable support (`.env`)
- validation and utilities
- Ready-to-use Postman collection

## Setup Instructions

### 1 Clone the Repository

git clone https://github.com/spDeveloper555/InsuredMine.git

cd InsuredMine

### 2 Install Dependencies

npm install

### 3 Start the Server
npm start

The server will run on http://localhost:3000

### API Testing (Postman)

### Task 1:

- Upload worker API:

Method - POST
URL - http://localhost:3000/api/task/upload
Body - 
{
    files: "excel"  // Form data
}
Response - 
{
    "success": "success",
    "message": "File processed successfully"
}

- List API:

Method - POST
URL - http://localhost:3000/api/task/list
Body - 
{
    "search": "",  // Optional  //Search only username
    "page": 1,  // Optional  
    "limit": 20  // Optional
}

Response:- 
{
    "status": "success",
    "page": 1,
    "limit": 20,
    "total": 1149,
    "totalPages": 58,
    "data": [{},...]
}


### Task 2:

-Schedule API:

Method:- POST

URL:- http://localhost:3000/api/task/schedule

Body:- 
{
    "message": "Run backup",  //Required
    "day": "Thursday",  //Required
    "time": "00:36"  //Required
}

Response:- 
{
    "status": "success",
    "message": "Message scheduled successfully"
}


### Track Real-time CPU Usage & Restart Node on 70% Usage

PM2 has a built-in feature to restart the server when CPU crosses a threshold.

Step 1 — Install PM2 [npm install pm2 -g]

Step 2 — Start Node App With CPU Watch
[pm2 start app.js --max-memory-restart=200M --restart-delay=5000 --cron-restart="0 */6 * * *" --watch]
(OR)
Step 3 — Start: [pm2 start ecosystem.config.js]
