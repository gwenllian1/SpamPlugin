# Spam Round plugin

This plugin allows teams to submit answers and zoomsense will automatically allocate points for correct and interact with the teams.
Each question will be its separate plugin.

** This plugin requires the use of the team plugin, the teams must have been allocated and set before using this plugin. **

## 2 Versions

There are 2 versions of this plugin:

### 1) Single Answer

In this version, only 1 correct answer can be submitted.
All the members in all teams can be submitting answers, if the answers are wrong, nothing happens.
This version is a race, the first team to submit the correct answer wins, once a correct answer has been submitted, no other answers will be accepted.
If someone answers one of the allowable answers, the zoombot will:

- let that team know they got the correct answer
- Increment the team's score
- message all other teams to tell them what the correct answer was and that they will now move on to the next round.
- automatically move to the next round

### 2) Multiple answers

In this version, each team can submit multiple correct answers simultaneously.
This version is not a race against other teams, each team can get points for submitting the correct answer, and the round does not automatically move on once a correct answer has been submitted.
If someone answers a correct answer, the zoombot will:

- let that team know they got the correct answer
- Increment the team's score

If someone answers a correct answer that the team already submitted before the zoombot will:

- let that team know they have already submitted that answer

## Config

use the `- plugin: spammessage` option to enable this plugin.
The config setting field contains the following fields:

- roundName: the name of this question
- roundType: either "single_answer" or "multiple_answer"
- solutions: an array of strings which represents the allowable answers for this question
- questionWeight: the amount to increment the team's score by if they answer an answer correctly

The `demo_config.txt` in the root of this repo contains an example file for how to configure this plugin
