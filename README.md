# Price is Right Slackbot

Games are a great way to teach people about the work that other people
are doing within a company.
The [Price is Right][0] is well-suited to help the product team learn more
about the deals that our sales team has closed, the metrics that our marketing
team is tracking, and the customer interactions that customer success tracks.
In addition, it also helps these teams to get a better understanding of what
our engineers and data team are trying to optimize.
The [Price is Right][0] achieves this goal since it gives everyone a chance to
make their best guess about the work that others are doing.

A slackbot seemed like the easiest way to get everyone involved.
I'm grateful that [Botkit](https://www.botkit.ai/) made this easy to implement.

If this sounds like it'd be useful to you, here are some instructions on how
to get the bot installed.

## Installation

[Register a new slackbot](http://my.slack.com/services/new/bot).

### Manual Approach

Place your API token into `.env`, so that it looks like:

```bash
token=SLACK_API_TOKEN
```

Then run the following commands to boot the bot locally:

```bash
$ npm install
$ npm start
```

### Docker Approach

Add your API token to `docker-compose.yml`.

```bash
$ docker-compose up
```

## Game Play

To start, you need to assign a game master. As the person who spins up the
chatbot, you do this by being the first one to direct messaging the
chatbot `I am your master`.

To see your options as the master, type `master help` into the direct message
with the chatbot.

To register new players, ask them to open a direct message with the chatbot and
message `game time`.

To see the options available to the player, type `help` into the direct message
with the chatbot.

## Contributing

### Bugs / Issues

If you find a bug or something that could improve the user experience,
please file an issue on this github project,
so contributors/maintainers can get started fixing them. :-)

### Submitting Pull Requests

- Fork this project
- Make a feature branch git checkout -b feature
- Make your changes and commit them to your feature branch
- Submit a pull request

[0]: https://en.wikipedia.org/wiki/The_Price_Is_Right
