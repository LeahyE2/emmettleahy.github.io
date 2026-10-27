# Portfolio site

A plain HTML, CSS and JavaScript portfolio for GitHub Pages. No build step and no frameworks.
Projects are Markdown files shown as case folders on the home page. Each one opens into a paper sheet on the same page.

## Folder map

```
index.html            Home page: intro, project list, about, contact
404.html              Page shown for missing addresses
css/style.css         All styling. Colours, fonts and spacing are tokens at the top
js/main.js            Theme toggle, project list, search, and the Markdown reader
js/vendor/            marked (Markdown) and DOMPurify (sanitiser), stored locally
fonts/                IBM Plex Sans, Serif and Mono, stored locally (SIL Open Font License)
images/               Cover images, avatar and favicon (all replaceable)
projects/index.json   The list of projects: title, summary, tags, date, cover image
projects/*.md         One Markdown file per project
.nojekyll             Tells GitHub Pages to serve the files as they are
```

Do not delete or overwrite the `CNAME` file in your repository. It holds your custom domain.

## Run it locally (or in a Codespace)

Browsers block `fetch` for files opened directly, so use a small server:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. In a Codespace, open the forwarded port 8000.

## Add a project

1. Create `projects/my-project.md` and write it in Markdown. Start headings at `##`, because the title comes from the index.
2. Add an entry to `projects/index.json`. The `slug` must match the file name without `.md`.
3. Optional: add a cover image to `images/` and point `cover` at it.
4. Commit and push. The site updates in a minute or two.

Entry fields: `id` (your reference, e.g. P-006), `slug`, `title`, `summary`, `domain` (becomes a filter button),
`tags`, `date` (YYYY-MM-DD), `status` (Complete, In progress or Planned), `cover`, `coverAlt`.
Entries are sorted by date, newest first.

## Writing tips for project files

- Images: `![Description](images/my-diagram.png)` (paths start from the site root, not the projects folder)
- Link to another project: `[text](#project/other-slug)`
- Callouts: a line starting with `>` is styled as a highlighted note
- Code: fenced blocks (three backticks) get a Copy button
- Tables work, and scroll sideways on small screens

## The creative bits (and how to tune them)

- **Folders:** each project is a manila folder. The cover image peeks out and rises on hover. Change `--manila` and `--manila-edge` in `css/style.css`.
- **Open/close transitions:** the folder grows into the sheet using the View Transitions API. Browsers without it just skip the animation.
- **Theme toggle:** the new theme spreads out from the button. Both light and dark are defined by `light-dark()` tokens.
- **Decrypting headline:** `decryptHeadline()` in `js/main.js`. Delete the call near the bottom of the file to turn it off.
- **Terminal:** the "At a glance" rows in `index.html` feed the `whoami` command, and the contact links feed `contact`. Add commands in the `commands` object in `initTerminal()`.
- **Stamps:** the sheet shows REVIEWED, DRAFT or PROPOSED based on `status`. Edit the `STAMPS` object in `js/main.js`.
- **Redaction bars:** in any project file, `||text||` becomes a bar readers click to reveal. This is cosmetic only: the text is still in the page source, so never put a real secret in a project file. Avoid using it inside tables.
- **Hidden flag:** a small CTF is hidden in the page source. To change the flag, base64-encode your own text and replace the string in the HTML comment at the bottom of `index.html` and the `atob(...)` call in `js/main.js`. Remove both to drop the game.
- All motion switches off for visitors who have "reduce motion" enabled.

## Header, hero and console

- **Header:** styled as a rack faceplate. The three links are patch-panel ports with status LEDs, and the LED for the section you are viewing lights up. Edit the links in `index.html`. Colours come from the same tokens as the rest of the site.
- **Hero network map:** an inline SVG in `index.html` (search for `netmap`). Each node is a link, so to add one, copy a node group, change its `href` and position, and add a path in `nm-links` for its cable. Packets are `animateMotion` elements and switch off for visitors who prefer reduced motion.
- **Console:** open it with the header button, the map's Console node, or the backtick key. Its `whoami` output comes from the hidden "At a glance" rows in `index.html`.
- **Availability badge:** the `avail` link in the header and the "Right now" footer column. Delete both if you do not want to show it.

## Change the look

- **Colours:** edit the `--paper`, `--ink`, `--accent` and related tokens at the top of `css/style.css`. Each one holds a light and a dark value: `light-dark(light, dark)`.
- **Fonts:** change `--font-sans` and `--font-serif`. Replace the files in `fonts/` if you switch families.
- **Text and sections:** edit `index.html`. Places meant for editing are marked with `EDIT` comments.
- **Images:** replace `images/avatar.svg` with your photo and update the `src` in `index.html`. Cover images can be SVG, PNG, JPG or WebP.

## Before you publish

- Replace `you@example.com` and the LinkedIn link in the contact section.
- Remove real IP addresses, hostnames, credentials and anything from other people's systems from every project.
- Check you are allowed to publish coursework, group work and CTF write-ups.
- Do not commit secrets. If one slips in, change it, because deleting the file does not remove it from git history.

## Third-party code

`marked` (MIT) and `DOMPurify` (Apache-2.0 / MPL-2.0) are in `js/vendor/` with their licences.
IBM Plex fonts are under the SIL Open Font License 1.1 (see `fonts/`).
To update a library, replace the file with a newer release from npm and test the project pages.
