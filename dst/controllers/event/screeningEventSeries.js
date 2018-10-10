"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 上映イベントシリーズコントローラー
 */
const chevre = require("@toei-jp/chevre-api-nodejs-client");
const createDebug = require("debug");
const moment = require("moment-timezone");
const _ = require("underscore");
const Message = require("../../common/Const/Message");
const debug = createDebug('chevre-backend:controllers');
// 1ページに表示するデータ数
// const DEFAULT_LINES: number = 10;
// 作品コード 半角64
const NAME_MAX_LENGTH_CODE = 64;
// 作品名・日本語 全角64
const NAME_MAX_LENGTH_NAME_JA = 64;
// 作品名・英語 半角128
const NAME_MAX_LENGTH_NAME_EN = 128;
/**
 * 新規登録
 */
function add(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const creativeWorkService = new chevre.service.CreativeWork({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient
        });
        // const eventService = new chevre.service.Event({
        //     endpoint: <string>process.env.API_ENDPOINT,
        //     auth: req.user.authClient
        // });
        const placeService = new chevre.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient
        });
        const searchMoviesResult = yield creativeWorkService.searchMovies({
            checkScheduleEndDate: true
        });
        const movies = searchMoviesResult.data;
        const searchMovieTheatersResult = yield placeService.searchMovieTheaters({});
        let message = '';
        let errors = {};
        if (req.method === 'POST') {
            // バリデーション
            validate(req);
            const validatorResult = yield req.getValidationResult();
            errors = req.validationErrors(true);
            if (validatorResult.isEmpty()) {
                // 作品DB登録
                try {
                    const movie = yield creativeWorkService.findMovieByIdentifier({ identifier: req.body.movieIdentifier });
                    const movieTheater = yield placeService.findMovieTheaterByBranchCode({ branchCode: req.body.locationBranchCode });
                    req.body.contentRating = movie.contentRating;
                    const attributes = createEventFromBody(req.body, movie, movieTheater);
                    debug('saving an event...', attributes);
                    // const event = await eventService.createScreeningEventSeries(attributes);
                    res.redirect('/complete');
                    // res.redirect(`/events/screeningEventSeries/${event.id}/update`);
                    return;
                }
                catch (error) {
                    message = error.message;
                }
            }
        }
        const forms = req.body;
        // 作品マスタ画面遷移
        debug('errors:', errors);
        res.render('events/screeningEventSeries/add', {
            message: message,
            errors: errors,
            forms: forms,
            movies: movies,
            movieTheaters: searchMovieTheatersResult.data
        });
    });
}
exports.add = add;
/**
 * 編集
 */
function update(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const creativeWorkService = new chevre.service.CreativeWork({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient
        });
        const eventService = new chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient
        });
        const placeService = new chevre.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient
        });
        const searchMoviesResult = yield creativeWorkService.searchMovies({
            checkScheduleEndDate: true
        });
        const searchMovieTheatersResult = yield placeService.searchMovieTheaters({});
        let message = '';
        let errors = {};
        const eventId = req.params.eventId;
        const event = yield eventService.findScreeningEventSeriesById({
            id: eventId
        });
        if (req.method === 'POST') {
            // バリデーション
            validate(req);
            const validatorResult = yield req.getValidationResult();
            errors = req.validationErrors(true);
            if (validatorResult.isEmpty()) {
                // 作品DB登録
                try {
                    const movie = yield creativeWorkService.findMovieByIdentifier({ identifier: req.body.movieIdentifier });
                    const movieTheater = yield placeService.findMovieTheaterByBranchCode({ branchCode: req.body.locationBranchCode });
                    req.body.contentRating = movie.contentRating;
                    const attributes = createEventFromBody(req.body, movie, movieTheater);
                    debug('saving an event...', attributes);
                    yield eventService.updateScreeningEventSeries({
                        id: eventId,
                        attributes: attributes
                    });
                    res.redirect(req.originalUrl);
                    return;
                }
                catch (error) {
                    message = error.message;
                }
            }
        }
        const forms = {
            movieIdentifier: (_.isEmpty(req.body.movieIdentifier)) ? event.workPerformed.identifier : req.body.movieIdentifier,
            nameJa: (_.isEmpty(req.body.nameJa)) ? event.name.ja : req.body.nameJa,
            nameEn: (_.isEmpty(req.body.nameEn)) ? event.name.en : req.body.nameEn,
            kanaName: (_.isEmpty(req.body.kanaName)) ? event.kanaName : req.body.kanaName,
            duration: (_.isEmpty(req.body.duration)) ? moment.duration(event.duration).asMinutes() : req.body.duration,
            locationBranchCode: event.location.branchCode,
            contentRating: event.workPerformed.contentRating,
            subtitleLanguage: event.subtitleLanguage,
            videoFormat: event.videoFormat,
            startDate: (_.isEmpty(req.body.startDate)) ?
                (event.startDate !== null) ? moment(event.startDate).tz('Asia/Tokyo').format('YYYY/MM/DD') : '' :
                req.body.startDate,
            endDate: (_.isEmpty(req.body.endDate)) ?
                (event.endDate !== null) ? moment(event.endDate).tz('Asia/Tokyo').format('YYYY/MM/DD') : '' :
                req.body.endDate,
            movieSubtitleName: (_.isEmpty(req.body.movieSubtitleName)) ? event.movieSubtitleName : req.body.movieSubtitleName,
            signageDisplayName: (_.isEmpty(req.body.signageDisplayName)) ? event.signageDisplayName : req.body.signageDisplayName,
            signageDislaySubtitleName: (_.isEmpty(req.body.signageDislaySubtitleName)) ?
                event.signageDislaySubtitleName : req.body.signageDislaySubtitleName,
            summaryStartDay: (_.isEmpty(req.body.summaryStartDay)) ? event.summaryStartDay : req.body.summaryStartDay,
            mvtkFlg: (_.isEmpty(req.body.mvtkFlg)) ? event.mvtkFlg : req.body.mvtkFlg,
            description: (_.isEmpty(req.body.description)) ? event.description : req.body.description
        };
        // 作品マスタ画面遷移
        debug('errors:', errors);
        res.render('events/screeningEventSeries/edit', {
            message: message,
            errors: errors,
            forms: forms,
            movies: searchMoviesResult.data,
            movieTheaters: searchMovieTheatersResult.data
        });
    });
}
exports.update = update;
/**
 * 作品 - レイティング
 */
function getRating(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const creativeWorkService = new chevre.service.CreativeWork({
                endpoint: process.env.API_ENDPOINT,
                auth: req.user.authClient
            });
            const data = yield creativeWorkService.getMovieRatingByIdentifier({
                identifier: req.query.identifier
            });
            res.json({
                success: true,
                results: data
            });
        }
        catch (error) {
            res.json({
                success: false,
                count: 0,
                results: []
            });
        }
    });
}
exports.getRating = getRating;
/**
 * リクエストボディからイベントオブジェクトを作成する
 */
function createEventFromBody(body, movie, movieTheater) {
    return {
        typeOf: chevre.factory.eventType.ScreeningEventSeries,
        name: {
            ja: body.nameJa,
            en: body.nameEn,
            kr: ''
        },
        kanaName: body.kanaName,
        alternativeHeadline: body.nameJa,
        location: {
            id: movieTheater.id,
            typeOf: movieTheater.typeOf,
            branchCode: movieTheater.branchCode,
            name: movieTheater.name,
            kanaName: movieTheater.kanaName
        },
        // organizer: {
        //     typeOf: OrganizationType.MovieTheater,
        //     identifier: params.movieTheater.identifier,
        //     name: params.movieTheater.name
        // },
        videoFormat: body.videoFormat,
        subtitleLanguage: body.subtitleLanguage,
        workPerformed: movie,
        duration: movie.duration,
        startDate: (!_.isEmpty(body.startDate)) ? moment(`${body.startDate}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ').toDate() : undefined,
        endDate: (!_.isEmpty(body.endDate)) ? moment(`${body.endDate}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ').toDate() : undefined,
        eventStatus: chevre.factory.eventStatusType.EventScheduled,
        movieSubtitleName: body.movieSubtitleName,
        signageDisplayName: body.signageDisplayName,
        signageDislaySubtitleName: body.signageDislaySubtitleName,
        summaryStartDay: body.summaryStartDay,
        mvtkFlg: body.mvtkFlg,
        description: {
            ja: body.description,
            en: '',
            kr: ''
        }
    };
}
/**
 * 検索API
 */
function search(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const eventService = new chevre.service.Event({
                endpoint: process.env.API_ENDPOINT,
                auth: req.user.authClient
            });
            const branchCode = req.query.branchCode;
            const fromDate = req.query.fromDate;
            const toDate = req.query.toDate;
            if (branchCode === undefined || fromDate === undefined || toDate === undefined) {
                throw new Error();
            }
            const { totalCount, data } = yield eventService.searchScreeningEventSeries({
                startThrough: moment(`${fromDate}T23:59:59+09:00`, 'YYYYMMDDTHH:mm:ssZ').toDate(),
                endFrom: moment(`${toDate}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ').toDate(),
                location: {
                    branchCodes: branchCode
                }
            });
            const results = data.map((event) => {
                return {
                    id: event.id,
                    movieIdentifier: event.workPerformed.identifier,
                    filmNameJa: event.name.ja,
                    filmNameEn: event.name.en,
                    kanaName: event.kanaName,
                    duration: moment.duration(event.duration).humanize(),
                    contentRating: event.workPerformed.contentRating,
                    subtitleLanguage: event.subtitleLanguage,
                    videoFormat: event.videoFormat
                };
            });
            results.sort((event1, event2) => {
                if (event1.filmNameJa > event2.filmNameJa) {
                    return 1;
                }
                if (event1.filmNameJa < event2.filmNameJa) {
                    return -1;
                }
                return 0;
            });
            res.json({
                success: true,
                count: totalCount,
                results: results
            });
        }
        catch (_) {
            res.json({
                success: false,
                count: 0,
                results: []
            });
        }
    });
}
exports.search = search;
/**
 * 一覧データ取得API
 */
function getList(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const eventService = new chevre.service.Event({
                endpoint: process.env.API_ENDPOINT,
                auth: req.user.authClient
            });
            const { totalCount, data } = yield eventService.searchScreeningEventSeries({
                limit: req.query.limit,
                page: req.query.page,
                name: req.query.name,
                endFrom: moment(new Date()).toDate(),
                location: {
                    branchCodes: (req.query.locationBranchCode !== '') ? [req.query.locationBranchCode] : undefined
                },
                workPerformed: {
                    identifiers: (req.query.movieIdentifier !== '') ? [req.query.movieIdentifier] : undefined
                }
            });
            const results = data.map((event) => {
                return {
                    id: event.id,
                    movieIdentifier: event.workPerformed.identifier,
                    filmNameJa: event.name.ja,
                    filmNameEn: event.name.en,
                    kanaName: event.kanaName,
                    // duration: moment.duration(event.duration).humanize(),
                    duration: event.duration,
                    contentRating: event.workPerformed.contentRating,
                    subtitleLanguage: ((event.subtitleLanguage === 1) ? '吹替' : (event.subtitleLanguage === 0) ? '字幕' : ''),
                    videoFormat: event.videoFormat,
                    movieSubtitleName: (_.isEmpty(event.movieSubtitleName)) ? '' : event.movieSubtitleName
                };
            });
            res.json({
                success: true,
                count: totalCount,
                results: results
            });
        }
        catch (error) {
            res.json({
                success: false,
                count: 0,
                results: error
            });
        }
    });
}
exports.getList = getList;
/**
 * 一覧
 */
function index(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const placeService = new chevre.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient
        });
        const searchMovieTheatersResult = yield placeService.searchMovieTheaters({});
        res.render('events/screeningEventSeries/index', {
            filmModel: {},
            movieTheaters: searchMovieTheatersResult.data
        });
    });
}
exports.index = index;
/**
 * 作品マスタ新規登録画面検証
 */
function validate(req) {
    let colName = '';
    // 作品コード
    colName = '作品コード';
    req.checkBody('movieIdentifier', Message.Common.required.replace('$fieldName$', colName)).notEmpty();
    req.checkBody('movieIdentifier', Message.Common.getMaxLength(colName, NAME_MAX_LENGTH_CODE)).len({ max: NAME_MAX_LENGTH_CODE });
    //.regex(/^[ -\~]+$/, req.__('Message.invalid{{fieldName}}', { fieldName: '%s' })),
    // 作品名
    colName = '作品名';
    req.checkBody('nameJa', Message.Common.required.replace('$fieldName$', colName)).notEmpty();
    req.checkBody('nameJa', Message.Common.getMaxLength(colName, NAME_MAX_LENGTH_CODE)).len({ max: NAME_MAX_LENGTH_NAME_JA });
    // 作品名カナ
    colName = '作品名カナ';
    req.checkBody('kanaName', Message.Common.required.replace('$fieldName$', colName)).notEmpty();
    req.checkBody('kanaName', Message.Common.getMaxLength(colName, NAME_MAX_LENGTH_NAME_JA)).len({ max: NAME_MAX_LENGTH_NAME_JA });
    // .regex(/^[ァ-ロワヲンーa-zA-Z]*$/, req.__('Message.invalid{{fieldName}}', { fieldName: '%s' })),
    // 作品名英
    colName = '作品名英';
    req.checkBody('nameEn', Message.Common.required.replace('$fieldName$', colName)).notEmpty();
    req.checkBody('nameEn', Message.Common.getMaxLength(colName, NAME_MAX_LENGTH_NAME_EN)).len({ max: NAME_MAX_LENGTH_NAME_EN });
    // 上映開始日
    colName = '上映開始日';
    if (!_.isEmpty(req.body.startDate)) {
        req.checkBody('startDate', Message.Common.invalidDateFormat.replace('$fieldName$', colName)).isDate();
    }
    // 上映終了日
    colName = '上映終了日';
    if (!_.isEmpty(req.body.endDate)) {
        req.checkBody('endDate', Message.Common.invalidDateFormat.replace('$fieldName$', colName)).isDate();
    }
    // レイティング
    // colName = 'レイティング';
    // req.checkBody('contentRating', Message.Common.required.replace('$fieldName$', colName)).notEmpty();
    // 上映形態
    colName = '上映形態';
    req.checkBody('videoFormat', Message.Common.required.replace('$fieldName$', colName)).notEmpty();
    // 上映作品サブタイトル名
    colName = '上映作品サブタイトル名';
    req.checkBody('movieSubtitleName', Message.Common.getMaxLength(colName, NAME_MAX_LENGTH_CODE)).len({ max: NAME_MAX_LENGTH_NAME_JA });
    // 集計開始曜日
    colName = '集計開始曜日';
    req.checkBody('summaryStartDay', Message.Common.required.replace('$fieldName$', colName)).notEmpty();
}
//# sourceMappingURL=screeningEventSeries.js.map