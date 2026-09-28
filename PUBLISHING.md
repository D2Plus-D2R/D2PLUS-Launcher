# Publish the prepared GitHub project

Suggested repository name: **D2PLUS-Launcher**. Release title: **D2PLUS Launcher — Alpha 0.0.2**. Tag: **v0.0.2-alpha**. Mark it as a **pre-release**.

## 1. Prepare the repository

Create a private draft repository first if the inherited artwork distribution review is unfinished; see PUBLIC-RELEASE-REVIEW.md. Extract the source ZIP and upload the contents of its `D2PLUS-Launcher` folder to the repository root. Include `.github/`; GitHub Desktop or git will include that folder reliably.

Keep the installer, portable ZIP, downloaded runtimes and your character saves out of git. The prepared `.gitignore` excludes build output, settings and saves. Put the large download packages in **Releases**, not the repository file tree.

## 2. Draft the prerelease

Open **Releases → Draft a new release**. Choose/create `v0.0.2-alpha` on the intended source commit. Paste `release-notes/v0.0.2-alpha.md` as the description, mark **This is a pre-release**, and attach:

- D2PLUS_Launcher_Setup_0.0.2-alpha.exe
- D2PLUS_Launcher_Portable_0.0.2-alpha.zip
- D2PLUS_GitHub_Alpha_0.0.2.zip
- SHA256SUMS-0.0.2-alpha.txt

Save as draft until the release review and your Windows smoke test are complete. When published, the site must use the tag-specific release URL. `/releases/latest` is unsuitable for this alpha.

## 3. Configure the page

Edit `site/config.json`: set `repository` to your exact `OWNER/D2PLUS-Launcher`, and leave `releasePublished` false until the public prerelease and its assets exist. Set it true only after checking the installer and ZIP downloads. The workflow gets the repository name from GitHub automatically; the config value also supports local previews.

In the repository choose **Settings → Pages → Source: GitHub Actions**. Then open **Actions → Publish D2PLUS page → Run workflow**. The prepared workflow is manual; merely uploading these files does not publish the website. It builds and publishes only `site/`, keeping the desktop backend and editor separate.

GitHub's deployment output reports the final page URL. For a standard project site it will usually be `https://OWNER.github.io/D2PLUS-Launcher/`; do not assume that address until GitHub confirms it.

For future edits, commit the page changes and manually run the workflow again. Do not place private information in site files. Local preview: run `python3 build/site.py`, then serve `_site/` with any static web server.

## 4. Check before announcing

Open the page on desktop and phone, verify each download, install on Windows, check button alignment at your display scaling, and test an offline game with damage numbers off. Test the overlay separately and record the exact executable version. Wiki/editor changes should use a disposable character first.

Official documentation checked for this handoff:
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository
