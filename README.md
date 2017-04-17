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

[Register a new slackbot](http://my.slack.com/services/new/bot)
and place your API token into `.env`, so that it looks like:

```bash
token=SLACK_API_TOKEN
```

Then run the following commands to boot the bot locally:

```bash
$ npm install
$ npm start
```

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
