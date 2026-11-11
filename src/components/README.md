# Components

Reusable UI widgets that appear on several pages (data tables, date pickers, modals). A component is a class like a
page object, built from locators in `src/locators/`, and used by the page objects that contain it.

Each tricky widget is handled one way, here, and every page uses that way: a date picker types an ISO date where the
widget allows it, a frame is reached with `frameLocator`, a dialog is accepted or dismissed with `page.on('dialog')`.
Business assertions stay in tests and `expect*` methods; components expose actions, not checks.
