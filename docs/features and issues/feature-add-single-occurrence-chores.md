# Add Single Occurrence Chores (SO Chores)

## Summary

A user should be able to add single occurrence chores (SO Chores) through a web based user interface.

## Acceptance Criteria

1. The user should be offered a form that includes the following fields:
    a. description (required)
    b. due date and time (optional)
    c. value in dollars (optional)
    d. assigned to (optional, multi-select)
2. Clicking a save button should write the chore to the database after validations.
3. After clicking the save button:
    a. if the chore is saved to the database a message should appear indicating that the chore was saved successfully.
    b. if the chore is not saved to the database a user appropriate message should appear indicating there was an error.
    c. in addition if the chore is not saved to the database a detailed structured error message should appear in the logs.
    d. the user should remain on the chore creation page with the cursor in the description field.
