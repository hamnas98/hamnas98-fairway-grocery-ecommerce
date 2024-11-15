/*
Template Name: Foodmart - Food & Grocery Delivery Mobile Template
Author: Askbootstrap
Author URI: https://themeforest.net/user/askbootstrap
Version: 0.1
*/

/*
- Sidebar
- Coupons
- Top Picks - Homepage
- All Categories - Homepage
- Product Detail
*/

(function ($) {
    "use strict"; // Start of use strict

    // Cart Item
    $('.minus').click(function() {
        var $input = $(this).parent().find('.box');
        var count = parseInt($input.val()) - 1;
        count = count < 1 ? 1 : count;
        $input.val(count);
        $input.change();
        return false;
    });
    $('.plus').click(function() {
        var $input = $(this).parent().find('.box');
        $input.val(parseInt($input.val()) + 1);
        $input.change();
        return false;
    });

    // Sidebar
    var $main_nav = $('#main-nav');
    var $toggle = $('.toggle');
    var defaultOptions = {
        disableAt: false,
        customToggle: $toggle,
        levelSpacing: 40,
        navTitle: 'App',
        levelTitles: true,
        levelTitleAsBack: true,
        pushContent: '#container',
        insertClose: 2
    };
    var Nav = $main_nav.hcOffcanvasNav(defaultOptions);

    // Coupons
    $('.coupons').slick({
        infinite: false,
        arrows: false,
        autoplay: true,
        slidesToShow: 1.3,
        slidesToScroll: 1,
    });

    // Top Picks - Homepage
    $('.top-picks').slick({
        infinite: false,
        arrows: false,
        autoplay: true,
        slidesToShow: 2.3,
        slidesToScroll: 1,
    });

    // All Categories - Homepage
    $('.all-cate').slick({
        infinite: false,
        arrows: false,
        autoplay: true,
        slidesToShow: 4.5,
        slidesToScroll: 4,
    });

    // Product Detail
    $('.product-slider').slick({
        arrows: false,
        autoplay: true,
        infinite: false,
        dots: true,
    });

    

})(jQuery);