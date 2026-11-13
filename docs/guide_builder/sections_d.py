from .common import h1, h2, h3, p, bullet, numbered, figure, callout, table, NAVY, GOLD, MUTED


def chapter_fleet_cost(doc):
    h1(doc, "9", "Fleet cost control", "Total cost of ownership, per vehicle")
    p(
        doc,
        "Fleet → Cost control is the workshop and total-cost-of-ownership ledger. Fuel, scheduled and corrective maintenance, spare parts and tyre replacement are recorded in one place, then reconciled by category, month and vehicle. It answers three practical questions: what did the fleet cost, which vehicle is consuming it, and what maintenance is coming next?",
    )
    figure(doc, "18-fleet-cost-control.jpg", "Fleet → Cost control — period selector, cost KPIs, monthly trend, cost composition, maintenance due and tyre positions.", 16.2)

    h2(doc, "What the ledger records")
    table(
        doc,
        ["Record type", "Key fields", "What it is for"],
        [
            ["Fuel logbook", "Date, vehicle, driver, odometer, litres, unit cost, total cost, fuel type, station, reference, receipt, notes", "Fuel spend, consumption, odometer movement and fuel efficiency."],
            ["Maintenance schedule", "Title, type (scheduled/corrective), status, scheduled and completed dates, odometer, vendor, labour cost, parts cost, invoice, next service date/odometer", "Workshop planning, service history and forward maintenance exposure."],
            ["Spare parts", "Date, vehicle, part name/number, quantity, unit cost, total cost, supplier, odometer, maintenance link, notes", "Parts consumption and the true cost of a repair."],
            ["Tyre replacement", "Date, vehicle, position, brand, size, serial number, quantity, unit cost, total cost, odometer, action (fitted/rotated/retired), notes", "Tyre lifecycle by position and cost per vehicle."],
        ],
        widths=[3.3, 10.0, 3.9],
        size=8.0,
        first_bold=True,
    )

    h2(doc, "Log a fuel purchase")
    numbered(doc, "Open **Fleet → Cost control** and choose **Log fuel**.")
    numbered(doc, "Select the vehicle and, if known, the driver.")
    numbered(doc, "Enter the date, odometer, litres and unit cost. The total is calculated automatically if you leave it blank.")
    numbered(doc, "Add the fuel type, station, receipt reference and any note. Attach the receipt link where the organisation stores it.")
    numbered(doc, "Save. The entry appears in the fiscal year's ledger and in the vehicle's cost line immediately.")
    bullet(doc, "Enter the odometer reading from the pump or dashboard. If it is higher than the vehicle's recorded odometer, the vehicle record advances automatically.")
    bullet(doc, "A fuel entry with no odometer reading still contributes to fuel spend, but it cannot contribute to distance or cost per km. Enter the reading whenever possible.")

    h2(doc, "Schedule and complete maintenance")
    numbered(doc, "Choose **Schedule service**. Enter the title and type, the scheduled date and the current odometer.")
    numbered(doc, "Record the vendor, labour estimate, parts estimate and the next service date or odometer.")
    numbered(doc, "Save the schedule. It appears in **Maintenance** and, when due within 30 days or overdue, in the **Maintenance due** panel.")
    numbered(doc, "When the work is complete, edit the record: set the status to **Completed**, enter the completed date, the actual labour and parts cost and the invoice number.")
    numbered(doc, "Set the next service date and odometer so the next cycle is visible before it becomes urgent.")
    bullet(doc, "The total cost is the sum of labour and parts unless you enter a different invoice total.")
    bullet(doc, "Link spare parts to the maintenance record where your process requires a consolidated repair cost.")

    h2(doc, "Record parts and tyres")
    numbered(doc, "Open the **Spare parts** tab and choose **+ Add**.")
    numbered(doc, "Select the vehicle, date, part name and number, quantity and unit cost.")
    numbered(doc, "Add the supplier, odometer and notes. The total is quantity × unit cost unless overridden.")
    numbered(doc, "Save. Repeat in the **Tyres** tab for a fitment, rotation or retirement, including the wheel position, brand, size, serial number and action.")
    table(
        doc,
        ["Tyre action", "When to use it", "Cost treatment"],
        [
            ["Fitted", "A new or replacement tyre is installed at a position.", "Full tyre cost in the period."],
            ["Rotated", "A tyre is moved to another position without replacement.", "Record any labour cost; no tyre purchase if none."],
            ["Retired", "A tyre is removed from service.", "Record disposal or write-off cost where applicable."],
        ],
        widths=[3.0, 8.2, 5.6],
        size=8.4,
        first_bold=True,
    )

    h2(doc, "Read the analytics")
    table(
        doc,
        ["KPI or chart", "Definition", "How to use it"],
        [
            ["Total cost", "Fuel + maintenance + parts + tyres for the selected fiscal year.", "Budget monitoring and period comparison."],
            ["Fuel / Maintenance / Tyres", "Cost by category, with litres, service count, parts count and tyre movements.", "Find the category driving a variance."],
            ["Cost / km", "Total vehicle cost ÷ distance derived from odometer readings.", "Compare vehicles only when distance data is complete."],
            ["Fuel efficiency", "Distance ÷ litres for fuel entries after the first reading.", "Spot a vehicle whose consumption is deteriorating."],
            ["Cost composition", "Share of each category in total spend.", "Explain the shape of the fleet budget."],
            ["Monthly trend", "Stacked monthly fuel, maintenance, parts and tyre spend.", "See seasonality and the effect of a workshop campaign."],
            ["Per-vehicle line", "Cost, distance, efficiency, cost/km, odometer and next maintenance by vehicle.", "Prioritise the vehicle that needs attention."],
            ["Maintenance due", "Scheduled or overdue services within the next 30 days.", "Prevent unplanned downtime and emergency repairs."],
            ["Tyre positions", "Latest fitment or movement by wheel position.", "Check rotation discipline and premature wear."],
        ],
        widths=[3.4, 7.7, 5.5],
        size=8.0,
        first_bold=True,
    )

    callout(
        doc,
        "Cost per km needs two odometer readings",
        "Distance is calculated between the first and last odometer readings in the period. A fleet that records only one fuel entry per vehicle will show spend correctly but no distance, efficiency or cost per km. Record the odometer at every fuel stop and at each workshop visit.",
        "gold",
    )

    h2(doc, "Month-end routine")
    numbered(doc, "Enter every fuel receipt and workshop invoice before the fleet report is due.")
    numbered(doc, "Reconcile the supplier statement to the ledger; investigate a missing invoice rather than adding a duplicate.")
    numbered(doc, "Complete scheduled maintenance records and set the next service date.")
    numbered(doc, "Review the **Maintenance due** and **Tyre positions** panels.")
    numbered(doc, "Compare the per-vehicle cost line with the previous month and explain any material movement.")
    numbered(doc, "Export or screenshot the view required by finance and retain it with the month-end pack.")

    callout(
        doc,
        "Do not double-count a repair",
        "A spare part linked to a maintenance record is part of the repair story. Do not also enter the same part as a separate line in the maintenance total. The analytics sum the ledger categories; duplicate evidence inflates the fleet budget.",
        "red",
    )


def chapter_social(doc):
    h1(doc, "10", "News and social distribution", "Publish once, reach every channel")
    p(
        doc,
        "The news studio publishes to the website first, then queues a separate social post for each enabled destination. Every destination gets its own delivery record, attempt count, error message and retry action. A missing credential is recorded as **SKIPPED** with a clear reason, never as an endless retry.",
    )
    figure(doc, "21-news-social.jpg", "News studio — article editor, social distribution settings, channel readiness and the delivery queue.", 16.2)

    h2(doc, "Set up the channels")
    numbered(doc, "Open **Manage News → Social distribution**.")
    numbered(doc, "Switch on **Enable distribution**. Choose **Auto-post new articles** if every published article should be shared automatically.")
    numbered(doc, "Turn on the destinations you use. A destination marked **Needs credentials** will queue as SKIPPED until its server credentials are present.")
    numbered(doc, "Set the default hashtags and decide whether the article image should be attached.")
    numbered(doc, "Use **Run queue** to process waiting posts immediately. The background worker also runs every five minutes.")
    table(
        doc,
        ["Destination", "Credentials in backend/.env", "Behaviour"],
        [
            ["Facebook Page", "FACEBOOK_PAGE_ID, FACEBOOK_PAGE_ACCESS_TOKEN", "Posts to the page feed, or as a photo when an image is attached."],
            ["LinkedIn", "LINKEDIN_ACCESS_TOKEN, LINKEDIN_AUTHOR_URN", "Creates an organisation page UGC post with the article link."],
            ["X / Twitter", "X_BEARER_TOKEN", "Posts a shortened caption within the character limit."],
            ["Telegram", "TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID", "Sends a message or photo to the configured channel."],
            ["Automation webhook", "SOCIAL_WEBHOOK_URL", "Sends a JSON `news.published` event to Buffer, Make, Zapier or a custom gateway."],
        ],
        widths=[3.3, 7.3, 5.9],
        size=8.0,
        first_bold=True,
    )

    h2(doc, "Publish an article")
    numbered(doc, "Choose **New article** and enter the English title and content. Add the Amharic version where available.")
    numbered(doc, "Add a video link or article image if the story has one.")
    numbered(doc, "Write an optional social caption. Leave it blank to use the title and opening text.")
    numbered(doc, "Leave **Share when saved** on to queue the enabled destinations, or turn it off for a website-only article.")
    numbered(doc, "Choose **Save article**. The article appears on the public newsroom immediately; the social queue is processed independently.")
    numbered(doc, "Open **Delivery queue** to confirm each destination. A sent post shows **SENT** and a link where the platform returns one.")

    h2(doc, "Delivery statuses")
    table(
        doc,
        ["Status", "Meaning", "Action"],
        [
            ["QUEUED", "Waiting for the next worker run.", "No action; the worker runs every five minutes."],
            ["SENDING", "The channel call is in progress.", "Wait; do not retry a post that is already sending."],
            ["SENT", "The platform accepted the post.", "Open the external link where available and confirm the rendering."],
            ["FAILED", "The platform rejected the call after retries.", "Read the **Detail** column, correct the credential or content, then **Retry**."],
            ["SKIPPED", "The destination is enabled but not configured, or the channel is unknown.", "Add the credential in backend/.env, restart the API, then **Retry**."],
        ],
        widths=[2.8, 7.6, 6.2],
        size=8.4,
        first_bold=True,
    )

    callout(
        doc,
        "Credentials never live in the browser",
        "Social tokens stay in `backend/.env` or the server secret store. The news studio shows whether a channel is ready, never the token itself. Do not paste a token into chat, a news caption or a screenshot.",
        "red",
    )

    h2(doc, "Editorial checklist")
    bullet(doc, "The title is specific and free of internal jargon; it is the first line most social audiences see.")
    bullet(doc, "The caption works without the image and does not rely on a broken link.")
    bullet(doc, "The public link and default hashtags are appended by the system; do not duplicate them in the caption.")
    bullet(doc, "The image is approved for public use and has no personal or confidential information.")
    bullet(doc, "After publishing, check the public newsroom, the queue and the platform rendering. Correct the article and use **Retry** only for a failed delivery.")


def chapter_executive(doc):
    h1(doc, "11", "Executive BI and the AI brief", "The portfolio on one screen")
    p(
        doc,
        "PMS → Executive is the portfolio command centre. It reads the same project, plan and financial evidence as the PMS dashboard and consolidated reports, then adds cross-filtering, portfolio health, risk ranking and an AI decision brief. The filters apply to every chart and to the exported dataset.",
    )
    figure(doc, "19-executive-bi.jpg", "PMS → Executive — cross-filtered portfolio intelligence, AI decision brief, health, delivery and spend and department performance.", 16.2)

    h2(doc, "Slice the portfolio")
    numbered(doc, "Open **PMS → Executive**.")
    numbered(doc, "Choose a **Department**, **Status**, **Fund** or **Manager** filter. Each selection re-queries the whole page.")
    numbered(doc, "Use **Clear filters** to return to the full portfolio.")
    numbered(doc, "Read the four headline metrics first: overall delivery, budget under delivery, budget variance and at-risk count.")
    numbered(doc, "Move to the AI brief, then the health chart, delivery and spend trend, department performance and the project attention table.")
    bullet(doc, "**Overall delivery** is the average progress of projects in the current slice.")
    bullet(doc, "**Budget under delivery** compares the approved plan with actual spend; **variance** is plan minus actual.")
    bullet(doc, "**At risk** counts projects whose schedule-adjusted health is At Risk or Overdue.")
    bullet(doc, "**Portfolio health** groups projects as On Track, Watch, At Risk or Overdue.")

    h2(doc, "The AI decision brief")
    p(doc, "The brief is generated from the filtered dataset. By default it is deterministic: the EB-EMS Insight Engine applies the portfolio rules and returns a summary, findings, recommended actions, a confidence score and a data-quality note. The same brief appears in each consolidated report.")
    table(
        doc,
        ["Element", "What it tells you"],
        [
            ["Summary", "The portfolio position in plain language: delivery, budget, utilisation and the most important constraint."],
            ["Signals", "The evidence behind the summary, including the slowest or most exposed dimension."],
            ["Next actions", "Three practical actions ranked for the next management conversation."],
            ["Confidence", "How complete the evidence is. Missing financial actuals or sparse progress data lowers confidence."],
            ["Data quality", "The evidence used: project count, activity and milestone counts, financial actuals and progress updates."],
        ],
        widths=[3.2, 13.8],
        size=8.5,
        first_bold=True,
    )

    callout(
        doc,
        "AI is optional, and never a black box",
        "The deterministic Insight Engine is always available and no portfolio data leaves the application. To refine the wording with a language model, set `AI_PROVIDER=openai` and `OPENAI_API_KEY` in the server environment. The model receives the aggregated analytical context, not the underlying project files. Review the wording before it is used in a board pack.",
        "blue",
    )

    h2(doc, "Power BI-ready dataset")
    numbered(doc, "Apply the filters you want the dataset to reflect.")
    numbered(doc, "Choose **Power BI dataset** in the hero.")
    numbered(doc, "The CSV downloads with one row per project and columns for status, priority, department, division, manager, fund, dates, progress, plan, actual, variance, utilisation, health, days to due, activity count and milestone count.")
    numbered(doc, "Import the CSV into Power BI Desktop or refresh it from the same endpoint. Keep the filtered view and the dashboard view on the same date.")
    bullet(doc, "The dataset is a flat extract, not a live embedded Power BI tenant. It is deliberately portable and contains no credentials.")
    bullet(doc, "Do not edit the downloaded CSV and present it as the system record. If the data is wrong, correct the project or plan and export again.")

    h2(doc, "Management routine")
    bullet(doc, "**Weekly:** refresh the portfolio, review the attention table and assign an owner to every At Risk or Overdue project.")
    bullet(doc, "**Monthly:** compare delivery and spend, confirm the AI brief against the consolidated report and update the board pack.")
    bullet(doc, "**Quarterly:** review the fund and manager slices, rebalance the portfolio and check that every project has a current progress update.")
