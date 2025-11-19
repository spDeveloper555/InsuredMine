const { body } = require('express-validator');

exports.scheduleValidator = [
    body('message')
        .trim()
        .notEmpty()
        .withMessage('Message is required')
        .bail()
        .isLength({ min: 3 })
        .withMessage('Message must be at least 3 characters long'),

    body('day')
        .trim()
        .notEmpty()
        .withMessage('Day is required')
        .bail()
        .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
        .withMessage('Day must be one of Monday–Sunday'),

    body('time')
        .trim()
        .notEmpty()
        .withMessage('Time is required')
        .bail()
        .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .withMessage('Time must be in HH:mm format (24-hour clock)')

];