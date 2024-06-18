The theme component extends functionality of the HouseAds-plugin by adding ad-spaces between posts. In simplest terms it:

Adds `<div id="rikatillsammans_desktop-panorama-1_X"></div>` between posts and keeps track of X so it increases with 1 for each interval.

Executes the following javascript to fill the div with an ad:
```
<script>
    lwhb.cmd.push(function () {
        lwhb.loadAd({
            tagId: "rikatillsammans_desktop-panorama-1_X"
        });
    });
</script>
</body>
```

See it in action here in a sandbox test:
https://rikatillsammans.se/221009-ads-test.html

```
<!DOCTYPE html>
<html>
<head>
    <title>221009 - Ads test</title>
    <meta charset="UTF-8" />

    <script
            async="async"
            src="https://lwadm.com/lw/pbjs?pid=9c40dbbb-3a4e-4be6-b760-a144d5939287"
    ></script>
    <script type="text/javascript">
        var lwhb = lwhb || { cmd: [] };
    </script>
</head>

<body>
<!-- RTREKLAM02 -->
<!-- Livewrapped tag: Panorama #1
 (970x250, 980x120, 980x240, 980x300, 980x360, 980x400, 980x480, 980x600) -->
<div id="rikatillsammans_desktop-panorama-1_a"></div>

<script>
    lwhb.cmd.push(function () {
        lwhb.loadAd({
            tagId: "rikatillsammans_desktop-panorama-1_a"
        });
    });
</script>
</body>
</html>
```

Please note that ads spaces can be executed correctly but not filled by ads. To check that open Console and start

`javascript:googletag.openConsole()`

If correctly executed than it will say overlay status "Displayed" and have a query_id but it will say "Ad unit did not fill".