(function () {
    function esc(str) {
        var d = document.createElement('div');
        d.textContent = str == null ? '' : String(str);
        return d.innerHTML;
    }

    function applySettings(settings) {
        if (!settings) return;

        // Footer / contact email
        if (settings.contact_email) {
            document.querySelectorAll('[data-setting="contact_email"]').forEach(function (el) {
                el.textContent = settings.contact_email;
            });
        }

        // Hero title & subtitle (homepage et al)
        if (settings.hero_title) {
            document.querySelectorAll('[data-setting="hero_title"]').forEach(function (el) {
                el.textContent = settings.hero_title;
            });
        }
        if (settings.hero_subtitle) {
            document.querySelectorAll('[data-setting="hero_subtitle"]').forEach(function (el) {
                el.textContent = settings.hero_subtitle;
            });
        }
        if (settings.announcement) {
            document.querySelectorAll('[data-setting="announcement"]').forEach(function (el) {
                el.textContent = settings.announcement;
            });
        }

        // Social links
        var socials = {
            twitter: settings.social_twitter,
            linkedin: settings.social_linkedin,
            instagram: settings.social_instagram
        };
        Object.keys(socials).forEach(function (key) {
            var url = socials[key];
            if (!url) return;
            document.querySelectorAll('[data-social="' + key + '"]').forEach(function (el) {
                el.setAttribute('href', url);
            });
        });
    }

    fetch((window.API_BASE || '') + '/api/settings')
        .then(function (r) { return r.json(); })
        .then(applySettings)
        .catch(function () { /* ignore */ });
})();
