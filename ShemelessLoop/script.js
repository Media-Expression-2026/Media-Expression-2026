window.addEventListener('DOMContentLoaded', () => {
    const group = document.querySelector('.loop-group');

    window.addEventListener('scroll', () => {
        const groupHeight = group.offsetHeight;
        const currentScroll = window.scrollY;

        // 下方向のループ判定
        if (currentScroll >= groupHeight) {
            // 超えた分のピクセル数を維持してトップに戻す（これがシームレスのコツ）
            window.scrollTo(0, currentScroll - groupHeight);
        }
        // 上方向のループ判定
        else if (currentScroll <= 0) {
            window.scrollTo(0, groupHeight + currentScroll);
        }
    });
});