EverMark
========

Google Chrome packaged app. Displays the bookmarks from your Evernote account on new tab page.

Still a work in progress.
At the moment has a finished OAuth setup that uses the new Chrome Identity API as well jsOAuth.js and evernote-sdk.js
to connect to a client's Evernote account and get a list of notes (bookmark entries) from a specified notebook (Bookmarks).
AngularJS framework is used alongside Bootstrap to organize the application.

The app is not yet finished and so has not been uploaded to Google Chrome store.
To get it working a config.js file needs to be added with the following contents:
```
var CONFIG = {
	clientId: [YOUR EVERNOTE DEVELOPER CLIENT_ID],
	clientSecret: [YOUR EVERNOTE DEVELOPER CLIENT_SECRET]
}
```

