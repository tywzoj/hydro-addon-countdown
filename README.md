# Hydro Addon Countdown

This is a [Hydro](https://github.com/hydro-dev/Hydro) Addon that provides a countdown feature for events. It allows users to create and manage events with specific dates, and displays the countdown to those events on the homepage.

## Installation

1. Clone the repository and install dependencies:

    ```bash
    git clone https://github.com/tywzoj/hydro-addon-countdown.git
    cd hydro-addon-countdown
    ```

2. Apply the addon to your Hydro instance:

    ```bash
    hydrooj addon add /path/to/hydro-addon-countdown
    pm2 restart hydrooj
    ```

## Usage

1. Goto the system settings page and find the "countdown.events" setting.
2. Edit the setting to add your events in the following format:

    ```yaml
    - name: "Event Name 1"
      date: "YYYY-MM-DD"
    - name: "Event Name 2"
      date: "YYYY-MM-DD"
    ```

3. Save the settings and the events will be displayed on the homepage.

## License

This project is licensed under the AGPL-3.0-only License. See the [LICENSE](LICENSE) file for details.
